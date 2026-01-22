import { ITransformationContext } from '../transformation-context.types'

/**
 * Add an import to the import tracker
 * Used to ensure required runtime imports are added to the file
 */
export const addImport = function(
    this: ITransformationContext,
    importName: string,
    fromModule: string
): void {
    const importKey = `${importName}:${fromModule}`
    this.imports.add(importKey)
}
