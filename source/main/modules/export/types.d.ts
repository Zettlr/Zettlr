/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Exporter Types
 * CVM-Role:        Types
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file exports a few types that are used by the exporter
 *                  PopOver in the main window and the exporter itself.
 *
 * END HEADER
 */

import { CodeFileDescriptor, MDFileDescriptor } from '../fsal/types'

/**
 * This interface descripes options that can be passed in general to the
 * exporter to control its behaviour.
 */
export interface ExporterOptions {
  /**
   * The format needs to conform to a format our exporter plugins understand.
   */
  format: string
  /**
   * This is an array of source files you wish to compile into the target file.
   */
  sourceFiles: Array<MDFileDescriptor|CodeFileDescriptor>
  /**
   * This is the directory into which the exporter should put the exported file.
   */
  targetDirectory: string
  /**
   * This is an optional property. If set and set to true, the exporter will
   * make sure to convert all image paths to absolute paths prior to export.
   */
  absoluteImagePaths?: boolean
  /**
   * This is an optional property. It allows to override the global CSL Stylesheet
   * defined in the preferences for the given export.
   */
  cslStyle?: string
  /**
   * This is an optional property. It allows manually setting a title in the
   * defaults file metadata.
   */
  title?: string
  /**
   * The current working directory for the Pandoc executable. Should be set
   * reasonably so that relative paths can be correctly resolved (especially
   * paths to images or other files).
   */
  cwd?: string
}

/**
 * This interface describes the output you will receive from the exporter. Please
 * note that even though the code (which should be 0) might not indicate any
 * errors, you should check the length of stderr.
 */
export interface ExporterOutput {
  /**
   * A code, corresponds to the return codes Pandoc gives. Zero indicates a
   * successful run.
   */
  code: number
  /**
   * In case Pandoc outputs verbose information, stdout will contain it, one
   * line at a time.
   */
  stdout: string[]
  /**
   * Any error given by Pandoc will be in this array, line by line.
   */
  stderr: string[]
  /**
   * This property contains the absolute path to the generated output file. Then
   * you can, for example, open it.
   */
  targetFile: string
}

/**
 * This describes information each exporting module needs to return when calling
 * pluginInformation().
 */
export interface ExporterInfo {
  /**
   * A unique ID for the exporter
   */
  id: string
  /**
   * A key-value record describing formats and their labels. Think of it as a
   * <select>'s options.
   */
  formats: Record<string, string>
  /**
   * This array can contain optional options, which basically map to whatever
   * you can pass into the Form.vue-component. Make sure to check other
   * exporters to see how these work.
   */
  options: any[] // TODO: Better types
}

export interface PandocRunnerOutput {
  code: number
  stdout: string[]
  stderr: string[]
}

/**
 * This is the exporter API that the plugins will have access to.
 */
export interface ExporterAPI {
  /**
   * Runs Pandoc with the given defaults file
   *
   * @param   {string}                       defaultsFile  The (already written) defaults file
   *
   * @return  {Promise<PandocRunnerOutput>}                Any output produced by Pandoc.
   */
  runPandoc: (defaultsFile: string) => Promise<PandocRunnerOutput>
  /**
   * Retrieves a user-customised defaults file, adds the given properties and
   * writes the file to disk. Returns the absolute path to the file.
   *
   * @param   {string}           writer      The writer for which the defaults apply
   * @param   {any}              properties  Any additional properties to add to the defaults.
   *
   * @return  {Promise<string>}              Resolves with an absolute path to the written file.
   */
  getDefaultsFor: (writer: string, properties: any) => Promise<string>
}

export interface ExporterPlugin {
  /**
   * Called whenever something requests information on the capabilities of the
   * exporter plugin. Must return an ExporterInfo.
   *
   * @return  {ExporterInfo}  The filled in exporter information.
   */
  pluginInformation: () => ExporterInfo
  /**
   * Called whenever this specific exporter needs to run. That is, when the
   * requested format (see ExporterOptions) is available on this exporter.
   *
   * @param   {ExporterOptions}      options        The options passed to the exporter
   * @param   {string[]}             sourceFiles    These are the actual, pre-processed source files, named <file-name>.intermediary.<file-ext>
   * @param   {any}                  formatOptions  A key-value object of all options the user set (if the plugin supports them)
   * @param   {any}                  context        This is a small API that can be used to retrieve defaults and call Pandoc.
   *
   * @return  {Promise<ExporterOutput>}             Returns an ExporterOutput after finishing the export.
   */
  run: (options: ExporterOptions, sourceFiles: string[], formatOptions: any, context: ExporterAPI) => Promise<ExporterOutput>
}
