#!/usr/bin/env ts-node

import * as core from '@actions/core';
import { execSync } from 'child_process';

const PREV_MAJOR = core.getInput('prev-major') || 'v6.6.';
const CUR_MAJOR = core.getInput('cur-major') || 'v6.7.';

const prevMajor = PREV_MAJOR.startsWith('v') ? PREV_MAJOR : `v${PREV_MAJOR}`;
const curMajor = CUR_MAJOR.startsWith('v') ? CUR_MAJOR : `v${CUR_MAJOR}`;

function getTags(): string[] {
    const out = execSync(
        'git -c "versionsort.suffix=-" ls-remote --exit-code --refs --sort="version:refname" --tags https://github.com/onlishop/onlishop',
        { encoding: 'utf-8' }
    );
    return out
        .split('\n')
        .map(line => line.split('/').pop()!)
        .filter(tag => tag && !tag.match(/dev|beta|alpha/i));
}

function getTagsWithoutRC(): string[] {
    const out = execSync(
        'git -c "versionsort.suffix=-" ls-remote --exit-code --refs --sort="version:refname" --tags https://github.com/onlishop/onlishop',
        { encoding: 'utf-8' }
    );
    return out
        .split('\n')
        .map(line => line.split('/').pop()!)
        .filter(tag => tag && !tag.match(/rc/i));
}

function printMinMaxTag(prefix: string) {
    const tagsNoRC = getTagsWithoutRC().filter(tag => tag.startsWith(prefix));
    const tagsAll = getTags().filter(tag => tag.startsWith(prefix));

    const minTag = tagsNoRC[0] || tagsAll[0] || '';
    const maxTag = tagsNoRC[tagsNoRC.length - 1] || tagsAll[tagsAll.length - 1] || '';

    console.log(`${prefix}_MIN_TAG=${minTag}`);
    console.log(`${prefix}_MAX_TAG=${maxTag}`);
}

function getNextMinorAndPatch(versionPrefix: string) {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon,...6=Sat
    const dayNextMonday = (8 - dayOfWeek) % 7 || 7;

    // 当前最新 tag
    const tagsNoRC = getTagsWithoutRC().filter(tag => tag.startsWith(versionPrefix));
    const tagsAll = getTags().filter(tag => tag.startsWith(versionPrefix));

    const maxTag = tagsNoRC[tagsNoRC.length - 1] || tagsAll[tagsAll.length - 1] || '';
    const parts = maxTag.replace(/^v/, '').split('.').map(p => parseInt(p, 10));

    if (parts.length < 3) throw new Error(`Invalid version: ${maxTag}`);
    if (parts.length === 3) parts.push(0);

    const [major, minor, patch, build] = parts;

    const nextMinorPatch = dayNextMonday < 7
        ? `${major}.${minor}.${patch + 2}.0`
        : `${major}.${minor}.${patch + 1}.0`;

    const nextPatch = `${major}.${minor}.${patch}.${build + 1}`;

    // LTS
    const tagsNoRCPrev = getTagsWithoutRC().filter(tag => tag.startsWith(prevMajor));
    const tagsAllPrev = getTags().filter(tag => tag.startsWith(prevMajor));
    const maxLTSTag = tagsNoRCPrev[tagsNoRCPrev.length - 1] || tagsAllPrev[tagsAllPrev.length - 1] || '';
    const ltsParts = maxLTSTag.replace(/^v/, '').split('.').map(p => parseInt(p, 10));
    if (ltsParts.length < 3) throw new Error(`Invalid LTS version: ${maxLTSTag}`);
    if (ltsParts.length === 3) ltsParts.push(0);
    const nextLTSPatch = `${ltsParts[0]}.${ltsParts[1]}.${ltsParts[2]}.${ltsParts[3] + 1}`;

    console.log(`NEXT_MINOR=${nextMinorPatch}`);
    console.log(`NEXT_PATCH=${nextPatch}`);
    console.log(`NEXT_LTS_PATCH=${nextLTSPatch}`);
}


printMinMaxTag(prevMajor);
printMinMaxTag(curMajor);
getNextMinorAndPatch(curMajor);
