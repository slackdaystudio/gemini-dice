/**
 * This script is capable of handling all of the different types of rolls The Gemini System 
 * uses.  
 * 
 * The roll types this script can handle are:
 * 
 *  1. Classic - rolls the dice and adds up the face values (will add in any pips as well)
 *  2. Success - rolls the dice and counts anything 3 or greater as a success
 *  3. Luck - counts any 6 rolled as a point of luck
 *  4. Unluck - any 1 rolled is counted as a point of unluck
 * 
 * This script is a heavily modified WildDie script originally created by The Aaron which may 
 * be found here: https://github.com/shdwjk/Roll20API/blob/master/WildDice/WildDice.js
 * 
 * Version: 1.0.0
 * Authors: The Aaron, sentry0
 * Contact: https://app.roll20.net/users/6148080/sentry0
 */
const GeminiDice = (() => {

    const version = '1.0.0';

    const checkInstall = () => {
        log('GeminiDice v' + version);
    };

    const dice = {
        1: 'A',
        2: 'B',
        3: 'C',
        4: 'D',
        5: 'E',
        6: 'F',
    }

    const ROLL_CRIT_FAILURE = 1;

    const ROLL_CRIT_SUCCESS = 6;

    const ROLL_TYPE_STANDARD = 0;

    const ROLL_TYPE_SUCCESS = 1;

    const ROLL_TYPE_LUCK = 2;

    const ROLL_TYPE_UNLUCK = 3;

    const SUCCESS_THRESHOLD = 3;

    const LUCK_THRESHOLD = 6;

    const UNLUCK_THRESHOLD = 1;

    const COLOR_DIE_NORMAL = '#2A2D2A';

    const COLOR_DIE_WILD = '#C8293D';

    const COLOR_DIE_SUCCESS = '#19B619';

    const COLOR_DIE_NEGATED = '#CDCFCD';

    const s = {
        failsum: "display: table-cell; text-align: center; vertical-align: center; line-height: 80px; font-size: 3em; background: #b30000; height: 80px; width: 80px; border-radius: 40px; border: 1px solid black; color: white; font-weight: bold;",
        diceblock: "background: white; border: 1px solid black; padding: 5px 3px; color: black; font-weight: bold;",
        clear: "clear: both;",
        result: "margin-bottom: 5px;"
    };

    const f = {
        outer: (...t) => `<div>${t.join('')}</div>`,
        diceblock: (t) => `<div style="${s.diceblock}">${t}${f.clear()}</div>`,
        result: (t) => `<div style="${s.result}">${t}</div>`,
        clear: () => `<div style="${s.clear}"></div>`,
        failsum: (n) => `<div style="${s.failsum}">${n}</div>`
    };

    const showHelp = (msg) => {
        sendChat('GeminiDice', `/w "${who(msg)}" ` +
            '<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">' +
                '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">' +
                    `GeminiDice v${version}` +
                '</div>' +
                '<div style="padding-left:10px;margin-bottom:3px;">' +
                    '<p>GeminiDice implements the rolling mechanics for all of the Gemini System roll styles.</p>' +
                    '<p>You may prepend a w to any command to whisper the result to the GM.  For example, <span style="font-family: serif;">!wgd &lt;Dice Expression&gt;</span> would send the result directly to the GM. ' + 
                    'A <b><span style="font-family: serif;">&lt;Dice Expression&gt; </span></b> is an inline dice expression, something akin to &lsqb;&lsqb;5d6+8&rsqb;&rsqb; which will then be parsed for the roll result.<p>' + 
                    '<p>Any command with the <span style="font-family: serif;">--help</span> argument will show this menu<p>' + 
                '</div>' +
                '<b>Commands</b>' +
                '<div style="padding-left:10px;">' +
                    '<b><span style="font-family: serif;">!gd [&lt;Dice Expression&gt; | --help]</span></b>' +
                    '<div style="padding-left: 10px;padding-right:20px">' +
                        '<p>Rolls the GeminiDice expression and diplays the results.</p>' +
                    '</div>' +
                    '<b><span style="font-family: serif;">!gds [&lt;Dice Expression&gt; | --help]</span></b>' +
                    '<div style="padding-left: 10px;padding-right:20px">' +
                        '<p>Rolls the GeminiDice expression counting any successes and diplays the results.</p>' +
                    '</div>' +
                    '<b><span style="font-family: serif;">!gdl [&lt;Dice Expression&gt; | --help]</span></b>' +
                    '<div style="padding-left: 10px;padding-right:20px">' +
                        '<p>Rolls the GeminiDice expression counting any Luck and diplays the results.</p>' +
                    '</div>' +
                    '<b><span style="font-family: serif;">!gdu [&lt;Dice Expression&gt; | --help]</span></b>' +
                    '<div style="padding-left: 10px;padding-right:20px">' +
                        '<p>Rolls the GeminiDice expression counting any Unluck and diplays the results.</p>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    };

    const getDiceCounts = (rolls) => (rolls || [])
        .reduce((m, r) => {
            m[r] = (m[r] || 0) + 1;
            return m;
        }, {});

    const who = (msg) => {
        return (getObj('player', msg.playerid) || { get: () => 'API' }).get('_displayname');
    }

    const parts = (msg) => {
        return msg.content.split(/\s+--/);
    }

    const initResult = (msg, type = ROLL_TYPE_STANDARD) => {
        let dice = msg.inlinerolls[0].results.rolls[0].results.map((r) => r.v);
        let wildDie = dice.pop();
        let pips = 0;

        if (msg.inlinerolls[0].results.rolls.length >= 2 && msg.inlinerolls[0].results.rolls[1].hasOwnProperty('expr')) {
            if (/^\+\([0-9]*\+[0-9]*\)/.test(msg.inlinerolls[0].results.rolls[1].expr)) {
                let pipParts = msg.inlinerolls[0].results.rolls[1].expr.slice(2, -1).split('+');
    
                pips = parseInt(pipParts[0], 10) + parseInt(pipParts[1], 10);
            } else if (/^(\+|\-)[0-9]*/.test(msg.inlinerolls[0].results.rolls[1].expr)) {
                pips = parseInt(msg.inlinerolls[0].results.rolls[1].expr, 10);
            }
        }
        
        return {
            type: type,
            dice: dice,
            pips: pips,
            wildDie: wildDie,
            bonusDice: [],
            sumFail: 0,
            markFirstMax: false,
        }
    }

    const roll = (msg, w) => {
        sendResultMessage(wildDie(initResult(msg)), w, msg);
    }

    const rollupRoll = (msg, w) => {
        let result = initResult(msg);
        let pipsAsDice = result.pips / 3;

        if (pipsAsDice !== 0) {
            let upperBound = 0;

            if (Number.isInteger(pipsAsDice)) {
                upperBound = pipsAsDice;
                result.pips = 0;
            } else {
                let remainder = pipsAsDice % 1;
                upperBound = Math.trunc(pipsAsDice);

                if (remainder > 0.0) {
                    result.pips = remainder > 0.6 ? 2 : 1;
                }
            }

            for (let i = 0; i < upperBound; i++) {
                result.dice.push(randomInteger(6));
            }
        }

        sendResultMessage(wildDie(result), w, msg);
    }

    const successRoll = (msg, w) => {
        let result = initResult(msg, ROLL_TYPE_SUCCESS);

        sendResultMessage(wildDie(result), w, msg);
    }

    const luckRoll = (msg, w, type) => {
        sendResultMessage(initResult(msg, type), w, msg);
    }

    const wildDie = (result) => {
        if (result.wildDie === ROLL_CRIT_FAILURE) {
            if (result.type === ROLL_TYPE_STANDARD) {
                let critFailDice = getDiceCounts(result.dice);
                let hasFail = Object.keys(critFailDice).length > 0;

                if (hasFail) {
                    --critFailDice[`${Math.max(...result.dice)}`];
                }

                result.sumFail = Object.keys(critFailDice).reduce((m, k) => (m + parseInt(k, 10) * critFailDice[k]), 0) + result.pips;
            } else if (result.type === ROLL_TYPE_SUCCESS) {
                let successes = [...result.dice, ...result.bonusDice].filter((d) => d >= SUCCESS_THRESHOLD).length;

                result.sumFail = successes > 0 ? successes - 1 : 0;
            }

            result.markFirstMax = true;
        } else if (result.wildDie === ROLL_CRIT_SUCCESS) {
            let errorDie = ROLL_CRIT_SUCCESS;

            while (ROLL_CRIT_SUCCESS === errorDie) {
                errorDie = randomInteger(6);

                result.bonusDice.push(errorDie);
            }
        }

        return result;
    }

    const sendResultMessage = (result, w, msg) => {
        let wrapper = (t) => t;

        if (/^template\b\s/.test(parts(msg)[1] || "")) {
            let template = `&{template:${msg.rolltemplate}}${parts(msg)[1].replace(/^template\s+/i, '')}`;

            wrapper = (t) => template.replace(/%%ROLL%%/i, t);
        }

        sendChat(`player|${msg.playerid}`, `${w ? '/w gm ' : ''}${
            wrapper(
                f.outer(
                    f.result(getTotal(result)),
                    f.diceblock(
                        getRegularDice(result).join('') +
                        getDie(result.wildDie, COLOR_DIE_WILD) +
                        getBonusDice(result.bonusDice).join('') + 
                        getPips(result.pips)
                    ),
                )
            )
        }`);
    }

    const getRegularDice = (result) => {
        return result.dice.map((d) => {
            let c = COLOR_DIE_NORMAL;

            if (result.markFirstMax && d === Math.max(...result.dice)) {
                c = COLOR_DIE_NEGATED;
                result.markFirstMax = false;
            }

            return getDie(d, c);
        });
    }

    const getBonusDice = (bonusDice) => {
        return bonusDice.map((d) => {
            return getDie(d, COLOR_DIE_SUCCESS);
        });
    }

    const getPips = (pips) => {
        if (pips === 0) {
            return '';
        }

        let sign = '+';

        if (pips < 0) {
            sign = '';
        }
        
        return `<div style="float:left; background-color: yellow; color: black; border: 1px solid #999999; border-radius: 10px; font-weight: bold; padding: 1px 5px; margin: 1px 8px;"> ${sign}${pips}</div>`;
    }


    const getDie = (die, color = COLOR_DIE_NORMAL) => {
        return `<div style="float: left; font-family: dicefontd6; font-size: 2em; color: ${color}; padding: 1px 1px; margin: 1px 1px;">${dice[die]}</div>`;
    }

    const getTotal = (result) => {
        const hasFail = result.wildDie === ROLL_CRIT_FAILURE;
        let sum = 0;

        if (result.type === ROLL_TYPE_STANDARD) {
            sum = [...result.dice, ...result.bonusDice, ...[result.wildDie]].reduce((a, b) => a + b, 0) + result.pips;
        } else if (result.type === ROLL_TYPE_SUCCESS) {
            sum = [...result.dice, ...result.bonusDice].filter((d) => d >= SUCCESS_THRESHOLD).length + (result.wildDie >= SUCCESS_THRESHOLD ? 1 : 0);
        } else if (result.type === ROLL_TYPE_LUCK || result.type === ROLL_TYPE_UNLUCK) {
            const threshold = result.type === ROLL_TYPE_LUCK ? LUCK_THRESHOLD : UNLUCK_THRESHOLD;

            sum = [...result.dice, ...result.bonusDice, ...[result.wildDie]].filter((d) => d === threshold).length;
        }

        sum = sum < 0 ? 0 : sum;

        return '<div style="display: table; margin: 0 auto">' + (hasFail ? f.failsum(result.sumFail < 0 ? 0 : result.sumFail) : '') +
            '<div style="display: table-cell; margin: auto; width: 50%; text-align: center; vertical-align: center; line-height: 80px; font-size: 3em; background: ' + (hasFail ? '#f09f1f' : '#25c21d') + '; height: 80px; width: 80px; border-radius: 40px; border: 1px solid black; color: white; font-weight: bold;">' + sum + '</div></div>'+
            '<div style="clear: both"></div>';
    }

    const handleInput = (msg) => {
        if (msg.type !== "api") {
            return;
        }

        const messageParts = parts(msg);

        // Is this a command we care about?
        if (!/^\!w?gd/.test(messageParts[0])) {
            return;
        }

        // Did the user pass in a help flag?
        if (messageParts.length === 2) {
            if (messageParts[1] === 'help') {
                showHelp(msg);
                return;
            }
        }

        const args = messageParts[0].split(/\s+/);
        const w = /^\!wgd/.test(args[0]);
        const command = w ? `!${args[0].substring(2)}` : args[0];

        switch (command) {
            // Normal roll, modifier taken as is and added/subtracted
            case '!gd':
                roll(msg, w);
                break;
            // Rollup roll, modifier is converted to dice with remainders as pips
            case '!gdr':
                rollupRoll(msg, w);
                break;
            // Success roll, counts successes per standard Gemini rules
            case '!gds':
                successRoll(msg, w);
                break;
            // Luck roll, every 6 rolled is one point of luck
            case '!gdl':
                luckRoll(msg, w, ROLL_TYPE_LUCK);
                break;
            // Unluck roll, every 1 rolled is one point of unluck
            case '!gdu':
                luckRoll(msg, w, ROLL_TYPE_UNLUCK);
                break;
            default:
                showHelp(msg);
        };
    }

    const registerEventHandlers = () => {
        on('chat:message', handleInput);
    };

    on('ready', () => {
        checkInstall();
        registerEventHandlers();
    });

    return {};
})();
