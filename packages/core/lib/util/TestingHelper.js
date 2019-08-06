export const RUNNING_TESTS = process.env['NODE_ENV'] === 'testing';
export let SHOW_POPUPS_AS_CONSOLE = false;

export const setPopupsAsConsole = bool => SHOW_POPUPS_AS_CONSOLE = bool;
