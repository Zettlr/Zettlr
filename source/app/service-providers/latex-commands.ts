import { promises as fs } from 'fs'
import defaultCommands from '../../../static/latex-commands.json'

export interface LatexCommand {
  name: string
  snippet: string
  description: string
}

function convert(command: {
  name: string
  snippet: string
  description: string
}): LatexCommand {
  return {
    name: command.name,
    snippet: command.snippet ?? `\\${command.name}`,
    description: command.description
  }
}

/**
 * Gets the list of latex commands specified in the config file.
 */
export async function parse (file: string): Promise<LatexCommand[]> {
  const fileContent = await fs.readFile(file, {
    encoding: 'utf8'
  })
  return JSON.parse(fileContent).map((command: any) => convert(command))
}

export function getDefault (): LatexCommand[] {
  return defaultCommands.map((command: any) => convert(command))
}
