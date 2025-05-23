import * as DMMF from '@prisma/dmmf'
import * as ts from '@prisma/ts-builders'

import { extArgsParam, getIncludeName, getModelArgName, getOmitName, getSelectName } from '../utils'
import { GenerateContext } from './GenerateContext'
import { getArgFieldJSDoc } from './helpers'
import { buildInputField } from './Input'

export class ArgsTypeBuilder {
  private moduleExport: ts.Export<ts.TypeDeclaration<ts.ObjectType>>

  constructor(
    private readonly type: DMMF.OutputType,
    private readonly context: GenerateContext,
    private readonly action?: DMMF.ModelAction,
  ) {
    this.moduleExport = ts
      .moduleExport(
        ts.typeDeclaration(getModelArgName(type.name, action), ts.objectType()).addGenericParameter(extArgsParam),
      )
      .setDocComment(ts.docComment(`${type.name} ${action ?? 'without action'}`))
  }

  private addProperty(prop: ts.Property) {
    this.moduleExport.declaration.type.add(prop)
  }

  addSchemaArgs(args: readonly DMMF.SchemaArg[]): this {
    for (const arg of args) {
      const inputField = buildInputField(arg, this.context)

      const docComment = getArgFieldJSDoc(this.type, this.action, arg)
      if (docComment) {
        inputField.setDocComment(ts.docComment(docComment))
      }
      this.addProperty(inputField)
    }
    return this
  }

  addSelectArg(selectTypeName: string = getSelectName(this.type.name)): this {
    this.addProperty(
      ts
        .property(
          'select',
          ts.unionType([
            ts.namedType(`Prisma.${selectTypeName}`).addGenericArgument(extArgsParam.toArgument()),
            ts.nullType,
          ]),
        )
        .optional()
        .setDocComment(ts.docComment(`Select specific fields to fetch from the ${this.type.name}`)),
    )

    return this
  }

  addIncludeArgIfHasRelations(includeTypeName = getIncludeName(this.type.name), type = this.type): this {
    const hasRelationField = type.fields.some((f) => f.outputType.location === 'outputObjectTypes')
    if (!hasRelationField) {
      return this
    }

    this.addProperty(
      ts
        .property(
          'include',
          ts.unionType([
            ts.namedType(`Prisma.${includeTypeName}`).addGenericArgument(extArgsParam.toArgument()),
            ts.nullType,
          ]),
        )
        .optional()
        .setDocComment(ts.docComment('Choose, which related nodes to fetch as well')),
    )

    return this
  }

  addOmitArg(): this {
    this.addProperty(
      ts
        .property(
          'omit',
          ts.unionType([
            ts.namedType(`Prisma.${getOmitName(this.type.name)}`).addGenericArgument(extArgsParam.toArgument()),
            ts.nullType,
          ]),
        )
        .optional()
        .setDocComment(ts.docComment(`Omit specific fields from the ${this.type.name}`)),
    )
    return this
  }

  setGeneratedName(name: string): this {
    this.moduleExport.declaration.setName(name)
    return this
  }

  setComment(comment: string): this {
    this.moduleExport.setDocComment(ts.docComment(comment))
    return this
  }

  createExport() {
    return this.moduleExport
  }
}
