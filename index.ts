/*
 * Created on Wed Apr 28 2021
 *
 * Copyright (c) storycraft. Licensed under the MIT Licence.
 */

import { OpenLinkProfiles, TalkClient } from 'node-kakao';
import { BotCredential, Bot } from './api/bot';
import { FileLogger, GroupLogger, StyledLogger, WritableLogger } from './api/logger';
import packages from './package.json';
import * as os from 'os';
import * as readline from 'readline';
import { BotModuleLoader } from './api/bot/loader';

async function main(credential: BotCredential) {
    const client = new TalkClient();
    const logger = new GroupLogger([
        new StyledLogger(new WritableLogger(process.stdout, process.stderr), true, true, true),
        new StyledLogger(new FileLogger('logs'), true, true, false)
    ]);

    logger.info(`${packages.name} ${packages.version} Node: ${process.versions.node} os: ${process.platform} mem: ${(os.totalmem() / 1073741824).toFixed(2)} GB`);

    const botRes = await Bot.start(
        credential,
        client,
        './data',
        logger
    );
    if (!botRes.success) {
        logger.fatal(`봇 시작중 오류가 발생했습니다. status: ${botRes.status}`);
        process.exit(-1);
    }

    const bot = botRes.result;

    // 모듈 로딩
    const loader = new BotModuleLoader(bot, 'modules');
    try {
        await Promise.all([
            loader.load('chat'),
            loader.load('console-util', { profile: {} as OpenLinkProfiles }),
            loader.load('man'),
            loader.load('misc'),
            loader.load('open-channel-manager'),
        ]);
    } catch (err) {
        logger.fatal(`모듈 로딩중 오류가 발생했습니다. err: ${err}`);
        process.exit(-1);
    }

    logger.info('봇이 시작되었습니다');

    process.stdin.unref();
    const iface = readline.createInterface(process.stdin, process.stdout, undefined, true);

    iface.setPrompt('> ');
    iface.prompt(true);
    iface.on('line', async (text) => {
        await bot.dispatchConsole(text);
        iface.prompt(true);
    });
}

main({
    deviceName: process.env['BOT_DEVICE_NAME'] || '',
    deviceUUID: process.env['BOT_DEVICE_UUID'] || '',
    email: process.env['BOT_ACCOUNT_EMAIL'] || '',
    password: process.env['BOT_ACCOUNT_PWD'] || ''
}).then();