/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ProviderContract
 * CVM-Role:        Class Contract
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class is the base for all service providers and defines
 *                  their external API.
 *
 * END HEADER
 */

export default abstract class ProviderContract {
  /**
   * Service providers implement a boot method which must be called after
   * instantiation of the singleton.
   *
   * @return  {Promise<void>}  boot must return a Promise.
   */
  public async boot (): Promise<void> {
    // An empty default implementation for providers who don't require their own
    // boot logic.
  }

  /**
   * Service providers implement a shutdown method which must be called before
   * the application shuts down.
   *
   * @return  {<Promise><void>}  shutdown must return a Promise.
   */
  public abstract shutdown (): Promise<void>
}
