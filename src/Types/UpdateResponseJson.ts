import { Endpoints } from "@octokit/types";

export type LastReleaseData = Endpoints["GET /repos/{owner}/{repo}/releases/{release_id}"]["response"]["data"];