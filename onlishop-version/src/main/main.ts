import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';

async function run() {
    try {
        const fallback = core.getInput('fallback') || 'trunk';
        const repo = core.getInput('repo') || 'onlishop/onlishop';
        const refInput = core.getInput('ref');
        const baseRefInput = core.getInput('base-ref');
        const headRefInput = core.getInput('head-ref');
        const githubToken = core.getInput('github-token');

        const octokit = githubToken ? new Octokit({ auth: githubToken }) : new Octokit();

        const [owner, repoName] = repo.includes('/')
            ? repo.split('/')
            : ['onlishop', 'onlishop'];

        // 1️⃣ 选择最终 REF
        let ref = headRefInput?.trim() || refInput?.trim() || '';
        let baseRef = baseRefInput?.trim() || '';

        if (!ref) {
            ref = baseRef || '';
        }

        const branches = await octokit.repos.listBranches({
            owner,
            repo: repoName,
            per_page: 100
        });

        const branchNames = branches.data.map(b => b.name);

        // 2️⃣ 查找匹配逻辑
        let version = fallback;

        if (branchNames.includes(ref)) {
            version = ref;
        } else if (baseRef && branchNames.includes(baseRef)) {
            version = baseRef;
        } else if (baseRef) {
            // next minor: 把最后一段数字改成 x
            const nextMinor = baseRef.replace(/[0-9]+$/, 'x');
            if (branchNames.includes(nextMinor)) {
                version = nextMinor;
            } else {
                // next major: 把最后两段数字改成 x
                const nextMajor = baseRef.replace(/[0-9]+\.[0-9]+$/, 'x');
                if (branchNames.includes(nextMajor)) {
                    version = nextMajor;
                }
            }
        }

        core.info(`Selected Onlishop version: ${version}`);
        core.setOutput('onlishop-version', version);
    } catch (err) {
        core.setFailed((err as Error).message);
    }
}

run();
