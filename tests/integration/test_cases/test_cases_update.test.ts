import { StatusCodes } from "http-status-codes";
import { TestCaseStatus } from "../../../src/models/testCase.model";
import { ProjectRole } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { projectsRoot } from "../../utils/project-fixtures";
import {
  createProjectForTestCases,
  inviteUserToRole,
  minimalLoadTestCasePayload,
  testCasesPath,
} from "../../utils/test-case-fixtures";
import { testClient } from "../../utils/test-client";

describe("PATCH /api/v1/projects/:projectId/test-cases/:testCaseId", () => {
  it("updates allowed fields for owner", async () => {
    const ctx = await createProjectForTestCases("tcup1");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;
    const v0 = created.body.data.testCase.latestVersion as number;

    const res = await testClient()
      .patch(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        name: "Renamed Probe",
        description: "edited",
        status: TestCaseStatus.ACTIVE,
      });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.data.name).toBe("Renamed Probe");
    expect(res.body.data.description).toBe("edited");
    expect(res.body.data.latestVersion).toBe(v0 + 1);
  });

  it("ignores immutable keys from the patch body", async () => {
    const ctx = await createProjectForTestCases("tcup-immu");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;
    const pid = `${created.body.data.testCase.project}`;

    await testClient()
      .patch(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        deletedAt: new Date(),
        createdAt: new Date("1999-01-01"),
      });

    const fetched = await testClient()
      .get(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(`${fetched.body.data.project}`).toEqual(pid);
    expect(fetched.body.data.deletedAt).toBeFalsy();
  });

  it("returns 422 when updated LOAD ramps exceed duration", async () => {
    const ctx = await createProjectForTestCases("tcup-rmp");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    const res = await testClient()
      .patch(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        loadProfile: {
          vus: 1,
          durationSeconds: 3,
          rampUpSeconds: 5,
          rampDownSeconds: 0,
        },
      });

    expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
  });

  it("validates patch payload from express-validator", async () => {
    const ctx = await createProjectForTestCases("tcup-ev");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    const badSlug = await testClient()
      .patch(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({ slug: "Bad_Slug" });
    expect(badSlug.status).toBe(StatusCodes.BAD_REQUEST);

    const badStatus = await testClient()
      .patch(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({ status: "FOO" });
    expect(badStatus.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("blocks VIEWER with 403", async () => {
    const ctx = await createProjectForTestCases("tcup-view");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const { accessToken } = await inviteUserToRole(
      ctx.projectId,
      ctx.ownerToken,
      "tcupviewer@example.com",
      ProjectRole.VIEWER,
    );

    const res = await testClient()
      .patch(
        `${testCasesPath(ctx.projectId)}/${created.body.data.testCase._id as string}`,
      )
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ description: "nope" });

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
  });

  it("returns 404 when the row is deleted", async () => {
    const ctx = await createProjectForTestCases("tcup-del");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    await testClient()
      .delete(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    const res = await testClient()
      .patch(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({ description: "late" });

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("allows MEMBER role to patch", async () => {
    const ctx = await createProjectForTestCases("tcup-member");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const { accessToken } = await inviteUserToRole(
      ctx.projectId,
      ctx.ownerToken,
      "tcupmem@example.com",
      ProjectRole.MEMBER,
    );

    const res = await testClient()
      .patch(
        `${testCasesPath(ctx.projectId)}/${created.body.data.testCase._id as string}`,
      )
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ description: "member edit" });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.data.description).toBe("member edit");
  });

  it("returns 403 when the caller is not a project member", async () => {
    const ctx = await createProjectForTestCases("tcup-out");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const outsider = await createUser({
      email: "tcup-out@example.com",
      username: "tcupout",
    });

    const res = await testClient()
      .patch(
        `${testCasesPath(ctx.projectId)}/${created.body.data.testCase._id as string}`,
      )
      .set(
        "Authorization",
        `Bearer ${createAccessToken(outsider.user._id.toString(), outsider.user.email)}`,
      )
      .send({ description: "nope" });

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
  });

  it("returns 400 when projectId in the path is not a Mongo id", async () => {
    const ctx = await createProjectForTestCases("tcup-badproj");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    const res = await testClient()
      .patch(`${projectsRoot}/bad-project-id/test-cases/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({ description: "x" });

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });
});
