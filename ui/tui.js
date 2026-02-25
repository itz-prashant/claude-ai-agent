import pkg from "terminal-kit"

const {terminal: term} = pkg

export const AGENT_THEME = {
  info: term.cyan,
  warning: term.yellow,
  error: term.brightRed.bold,
  success: term.green,
  dim: term.dim,
  muted: term.gray,
  border: term.gray,
  highlight: term.bold.cyan,

  user: term.brightBlue.bold,
  assistant: term.brightWhite,

  tool: term.brightMagenta.bold,
  "tool.read": term.cyan,
  "tool.write": term.yellow,
  "tool.shell": term.magenta,
  "tool.network": term.brightBlue,
  "tool.memory": term.green,
  "tool.mcp": term.brightCyan,

  code: term.white,
};


let tuiConsole = null

export function getTuiConsole(){
  if(tuiConsole === null){
    tuiConsole = term
  }
  return tuiConsole
}


export class TUI {

  constructor(consoleInstance = null){
    this.tuiConsole = consoleInstance ?? getTuiConsole()
  }

  streamAssistantDelta(content){
    AGENT_THEME.assistant(content)
  }
}
