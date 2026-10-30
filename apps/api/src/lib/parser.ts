import path from 'node:path';
import ts from 'typescript';
import type {
  ClassMethod,
  ClassProperty,
  ClassSymbol,
  CodeExport,
  CodeImport,
  FileSymbols,
  FunctionSymbol,
  TypeSymbol,
} from '@codemind/shared';

export interface ParsedFileResult {
  filePath: string;
  language: string;
  lineCount: number;
  codeLineCount: number;
  imports: CodeImport[];
  exports: CodeExport[];
  symbols: FileSymbols;
  dependencies: string[];
  hasErrors: boolean;
  parseDiagnostics?: string[];
}

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

export function getScriptTargetAndLanguage(filePath: string): {
  language: string;
  scriptKind: ts.ScriptKind;
} {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.tsx':
      return { language: 'typescriptreact', scriptKind: ts.ScriptKind.TSX };
    case '.ts':
      return { language: 'typescript', scriptKind: ts.ScriptKind.TS };
    case '.jsx':
      return { language: 'javascriptreact', scriptKind: ts.ScriptKind.JSX };
    case '.mjs':
    case '.cjs':
    case '.js':
      return { language: 'javascript', scriptKind: ts.ScriptKind.JS };
    default:
      return { language: 'unknown', scriptKind: ts.ScriptKind.Unknown };
  }
}

export function isSupportedSourceFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

function calculateLineCounts(content: string): { lineCount: number; codeLineCount: number } {
  const lines = content.split(/\r?\n/);
  const lineCount = lines.length;
  let codeLineCount = 0;
  let inBlockComment = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (inBlockComment) {
      if (line.includes('*/')) {
        inBlockComment = false;
        const afterComment = line.substring(line.indexOf('*/') + 2).trim();
        if (afterComment && !afterComment.startsWith('//')) {
          codeLineCount++;
        }
      }
      continue;
    }

    if (line.startsWith('/*')) {
      if (!line.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    if (line.startsWith('//')) {
      continue;
    }

    codeLineCount++;
  }

  return { lineCount, codeLineCount };
}

function isExportedNode(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return modifiers ? modifiers.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword) : false;
}

function isDefaultExportNode(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return modifiers ? modifiers.some((mod) => mod.kind === ts.SyntaxKind.DefaultKeyword) : false;
}

function isAsyncNode(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return modifiers ? modifiers.some((mod) => mod.kind === ts.SyntaxKind.AsyncKeyword) : false;
}

function isStaticNode(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return modifiers ? modifiers.some((mod) => mod.kind === ts.SyntaxKind.StaticKeyword) : false;
}

function getVisibility(node: ts.Node): 'public' | 'protected' | 'private' | undefined {
  if (!ts.canHaveModifiers(node)) return undefined;
  const modifiers = ts.getModifiers(node);
  if (!modifiers) return undefined;
  for (const mod of modifiers) {
    if (mod.kind === ts.SyntaxKind.PrivateKeyword) return 'private';
    if (mod.kind === ts.SyntaxKind.ProtectedKeyword) return 'protected';
    if (mod.kind === ts.SyntaxKind.PublicKeyword) return 'public';
  }
  return undefined;
}

export function parseSourceFile(filePath: string, content: string): ParsedFileResult {
  const { language, scriptKind } = getScriptTargetAndLanguage(filePath);
  const { lineCount, codeLineCount } = calculateLineCounts(content);

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );

  const imports: CodeImport[] = [];
  const exports: CodeExport[] = [];
  const functions: FunctionSymbol[] = [];
  const classes: ClassSymbol[] = [];
  const types: TypeSymbol[] = [];
  const diagnostics: string[] = [];

  // Parse diagnostics if there are syntax errors
  // @ts-expect-error parseDiagnostics exists on SourceFile
  const parseErrors = sourceFile.parseDiagnostics as ts.Diagnostic[] | undefined;
  const hasErrors = Array.isArray(parseErrors) && parseErrors.length > 0;
  if (hasErrors) {
    for (const d of parseErrors) {
      const msg = typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText;
      diagnostics.push(msg);
    }
  }

  function visit(node: ts.Node) {
    // 1. Imports
    if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const source = node.moduleSpecifier.text;
        const isRelative = source.startsWith('./') || source.startsWith('../');
        const specifiers: string[] = [];
        let defaultImport: string | undefined;
        const isTypeOnly = node.importClause?.isTypeOnly ?? false;

        if (node.importClause) {
          if (node.importClause.name) {
            defaultImport = node.importClause.name.text;
          }
          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const elem of node.importClause.namedBindings.elements) {
                specifiers.push(elem.name.text);
              }
            } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              specifiers.push(`* as ${node.importClause.namedBindings.name.text}`);
            }
          }
        }

        imports.push({
          source,
          isRelative,
          specifiers,
          defaultImport,
          isTypeOnly,
        });
      }
    }

    // 2. Export Declarations (e.g. export { a, b } from './x' or export { foo })
    if (ts.isExportDeclaration(node)) {
      const isTypeOnly = node.isTypeOnly;
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const elem of node.exportClause.elements) {
          exports.push({
            name: elem.name.text,
            isDefault: false,
            isTypeOnly,
          });
        }
      }
    }

    // Export Assignment (e.g. export default foo)
    if (ts.isExportAssignment(node)) {
      let name = 'default';
      if (ts.isIdentifier(node.expression)) {
        name = node.expression.text;
      }
      exports.push({
        name,
        isDefault: true,
      });
    }

    // 3. Function Declarations
    if (ts.isFunctionDeclaration(node)) {
      const name = node.name ? node.name.text : isDefaultExportNode(node) ? 'default' : 'anonymous';
      const isExported = isExportedNode(node) || isDefaultExportNode(node);
      const isAsync = isAsyncNode(node);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const parameters = node.parameters.map((p) => p.name.getText(sourceFile));
      const returnType = node.type?.getText(sourceFile);

      functions.push({
        name,
        parameters,
        returnType,
        isAsync,
        isExported,
        line,
      });

      if (isExported && name !== 'anonymous') {
        exports.push({
          name,
          isDefault: isDefaultExportNode(node),
        });
      }
    }

    // Variable statements (e.g. export const fn = () => {})
    if (ts.isVariableStatement(node)) {
      const isExported = isExportedNode(node);
      for (const decl of node.declarationList.declarations) {
        if (
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          const fnName = decl.name.getText(sourceFile);
          const line = sourceFile.getLineAndCharacterOfPosition(decl.getStart(sourceFile)).line + 1;
          const parameters = decl.initializer.parameters.map((p) => p.name.getText(sourceFile));
          const returnType = decl.initializer.type?.getText(sourceFile);
          const isAsync = isAsyncNode(decl.initializer);

          functions.push({
            name: fnName,
            parameters,
            returnType,
            isAsync,
            isExported,
            line,
          });

          if (isExported) {
            exports.push({
              name: fnName,
              isDefault: false,
            });
          }
        } else if (isExported) {
          const varName = decl.name.getText(sourceFile);
          exports.push({
            name: varName,
            isDefault: false,
          });
        }
      }
    }

    // 4. Class Declarations
    if (ts.isClassDeclaration(node)) {
      const name = node.name
        ? node.name.text
        : isDefaultExportNode(node)
          ? 'default'
          : 'AnonymousClass';
      const isExported = isExportedNode(node) || isDefaultExportNode(node);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      let extendsClass: string | undefined;
      const implementsList: string[] = [];

      if (node.heritageClauses) {
        for (const hc of node.heritageClauses) {
          if (hc.token === ts.SyntaxKind.ExtendsKeyword) {
            extendsClass = hc.types[0]?.expression.getText(sourceFile);
          } else if (hc.token === ts.SyntaxKind.ImplementsKeyword) {
            for (const t of hc.types) {
              implementsList.push(t.expression.getText(sourceFile));
            }
          }
        }
      }

      const methods: ClassMethod[] = [];
      const properties: ClassProperty[] = [];

      for (const member of node.members) {
        if (ts.isMethodDeclaration(member)) {
          methods.push({
            name: member.name.getText(sourceFile),
            parameters: member.parameters.map((p) => p.name.getText(sourceFile)),
            returnType: member.type?.getText(sourceFile),
            isAsync: isAsyncNode(member),
            isStatic: isStaticNode(member),
            visibility: getVisibility(member),
          });
        } else if (ts.isPropertyDeclaration(member)) {
          properties.push({
            name: member.name.getText(sourceFile),
            type: member.type?.getText(sourceFile),
            isStatic: isStaticNode(member),
            visibility: getVisibility(member),
          });
        }
      }

      classes.push({
        name,
        extends: extendsClass,
        implements: implementsList.length > 0 ? implementsList : undefined,
        methods,
        properties,
        isExported,
        line,
      });

      if (isExported && name !== 'AnonymousClass') {
        exports.push({
          name,
          isDefault: isDefaultExportNode(node),
        });
      }
    }

    // 5. Interface Declarations
    if (ts.isInterfaceDeclaration(node)) {
      const name = node.name.text;
      const isExported = isExportedNode(node);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

      types.push({
        name,
        kind: 'interface',
        isExported,
        line,
      });

      if (isExported) {
        exports.push({
          name,
          isDefault: false,
          isTypeOnly: true,
        });
      }
    }

    // 6. Type Alias Declarations
    if (ts.isTypeAliasDeclaration(node)) {
      const name = node.name.text;
      const isExported = isExportedNode(node);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

      types.push({
        name,
        kind: 'type',
        isExported,
        line,
      });

      if (isExported) {
        exports.push({
          name,
          isDefault: false,
          isTypeOnly: true,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);

  // Extract dependencies: unique relative or external source specifiers
  const dependencies = Array.from(new Set(imports.map((i) => i.source)));

  return {
    filePath,
    language,
    lineCount,
    codeLineCount,
    imports,
    exports,
    symbols: {
      functions,
      classes,
      types,
    },
    dependencies,
    hasErrors,
    parseDiagnostics: diagnostics.length > 0 ? diagnostics : undefined,
  };
}

/**
 * Resolves relative imports between repository files deterministically.
 */
export function resolveIntraRepoDependency(
  sourceFilePath: string,
  importPath: string,
  allFilePaths: string[],
): string | null {
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    return null;
  }

  const sourceDir = path.posix.dirname(sourceFilePath.replace(/\\/g, '/'));
  const candidateBase = path.posix.normalize(path.posix.join(sourceDir, importPath));

  const knownPathsNormalized = allFilePaths.map((p) => p.replace(/\\/g, '/'));

  // Direct match
  if (knownPathsNormalized.includes(candidateBase)) {
    return candidateBase;
  }

  // Extensions to probe
  const candidateExtensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
  for (const ext of candidateExtensions) {
    const candidate = `${candidateBase}${ext}`;
    if (knownPathsNormalized.includes(candidate)) {
      return candidate;
    }
  }

  // Index file probes
  for (const ext of candidateExtensions) {
    const candidate = path.posix.join(candidateBase, `index${ext}`);
    if (knownPathsNormalized.includes(candidate)) {
      return candidate;
    }
  }

  return null;
}
