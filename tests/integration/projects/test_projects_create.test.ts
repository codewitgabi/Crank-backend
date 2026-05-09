import { StatusCodes } from "http-status-codes";
import { ProjectRole, ProjectVisibility } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { projectsRoot } from "../../utils/project-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/projects", () => {
  it("creates a project and adds creator as OWNER", async () => {
    const { user } = await createUser({
      email: "creator@example.com",
      username: "creator",
    });
    const token = createAccessToken(user._id.toString(), user.email);

    const res = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "My API Project" });

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.message).toBe("Project created successfully");
    expect(res.body.data.name).toBe("My API Project");
    expect(res.body.data.slug).toBe("my-api-project");
    expect(res.body.data.visibility).toBe(ProjectVisibility.PRIVATE);
    expect(res.body.data.defaultBranch).toBe("main");
    expect(res.body.data.members.some((m: { role: ProjectRole }) => m.role === ProjectRole.OWNER)).toBe(true);
  });

  it("accepts optional slug, visibility, repository URL, branch, tags, and description", async () => {
    const { user } = await createUser({
      email: "full@example.com",
      username: "fulluser",
    });
    const token = createAccessToken(user._id.toString(), user.email);

    const res = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Ignored For Slug",
        slug: "Custom-Slug",
        description: "A description",
        visibility: ProjectVisibility.INTERNAL,
        repositoryUrl: "https://github.com/org/repo",
        defaultBranch: "develop",
        tags: ["backend", "api"],
      });

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.data.slug).toBe("custom-slug");
    expect(res.body.data.visibility).toBe(ProjectVisibility.INTERNAL);
    expect(res.body.data.repositoryUrl).toBe("https://github.com/org/repo");
    expect(res.body.data.defaultBranch).toBe("develop");
    expect(res.body.data.tags).toEqual(["backend", "api"]);
    expect(res.body.data.description).toBe("A description");
  });

  it("returns 400 when slug collides with an active owned project name", async () => {
    const { user } = await createUser({
      email: "dupe-owner@example.com",
      username: "dupeowner",
    });
    const token = createAccessToken(user._id.toString(), user.email);

    await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unique Name Alpha" });

    const res = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "unique name alpha" });

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    expect(res.body.error.message).toContain("already have a project with this name");
  });

  it("returns 400 when reusing slug of a soft-deleted project", async () => {
    const { user } = await createUser({
      email: "soft-del@example.com",
      username: "softdel",
    });
    const token = createAccessToken(user._id.toString(), user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "gone-project" });
    expect(created.status).toBe(StatusCodes.CREATED);
    const id = created.body.data.id as string;

    await testClient()
      .delete(`${projectsRoot}/${id}`)
      .set("Authorization", `Bearer ${token}`);

    const res = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "gone-project" });

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    expect(res.body.error.message).toContain("deleted project");
  });

  it("validates core fields", async () => {
    const { user } = await createUser({
      email: "val-create@example.com",
      username: "valcreate",
    });
    const token = createAccessToken(user._id.toString(), user.email);

    const emptyName = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" });
    expect(emptyName.status).toBe(StatusCodes.BAD_REQUEST);

    const badSlug = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Valid Name", slug: "bad_slug" });
    expect(badSlug.status).toBe(StatusCodes.BAD_REQUEST);

    const badVisibility = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Good", visibility: "PUBLIC" });
    expect(badVisibility.status).toBe(StatusCodes.BAD_REQUEST);
  });
});
