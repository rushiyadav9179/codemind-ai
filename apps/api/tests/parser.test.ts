import { describe, expect, it } from 'vitest';
import {
  getScriptTargetAndLanguage,
  isSupportedSourceFile,
  parseSourceFile,
  resolveIntraRepoDependency,
} from '../src/lib/parser';

describe('Code Intelligence Engine — Parser', () => {
  it('correctly detects supported and unsupported file extensions', () => {
    expect(isSupportedSourceFile('src/index.ts')).toBe(true);
    expect(isSupportedSourceFile('src/components/App.tsx')).toBe(true);
    expect(isSupportedSourceFile('src/utils.js')).toBe(true);
    expect(isSupportedSourceFile('src/Button.jsx')).toBe(true);
    expect(isSupportedSourceFile('src/module.mjs')).toBe(true);
    expect(isSupportedSourceFile('src/config.cjs')).toBe(true);

    expect(isSupportedSourceFile('src/styles.css')).toBe(false);
    expect(isSupportedSourceFile('src/data.json')).toBe(false);
    expect(isSupportedSourceFile('README.md')).toBe(false);
    expect(isSupportedSourceFile('binary.png')).toBe(false);

    expect(getScriptTargetAndLanguage('src/index.ts').language).toBe('typescript');
    expect(getScriptTargetAndLanguage('src/app.tsx').language).toBe('typescriptreact');
    expect(getScriptTargetAndLanguage('src/index.js').language).toBe('javascript');
    expect(getScriptTargetAndLanguage('src/app.jsx').language).toBe('javascriptreact');
  });

  it('extracts imports (relative, external, default, named, and type-only)', () => {
    const code = `
      import React, { useState, useEffect } from 'react';
      import type { UserRole } from '@codemind/shared';
      import * as utils from './utils';
      import { authService as service } from '../services/auth.service';
      import './styles.css';
    `;

    const result = parseSourceFile('src/test.ts', code);
    expect(result.imports).toHaveLength(5);

    // react
    const reactImport = result.imports.find((i) => i.source === 'react');
    expect(reactImport).toBeDefined();
    expect(reactImport?.isRelative).toBe(false);
    expect(reactImport?.defaultImport).toBe('React');
    expect(reactImport?.specifiers).toEqual(['useState', 'useEffect']);
    expect(reactImport?.isTypeOnly).toBe(false);

    // @codemind/shared type-only
    const sharedImport = result.imports.find((i) => i.source === '@codemind/shared');
    expect(sharedImport).toBeDefined();
    expect(sharedImport?.isTypeOnly).toBe(true);
    expect(sharedImport?.specifiers).toEqual(['UserRole']);

    // relative namespace
    const relativeUtils = result.imports.find((i) => i.source === './utils');
    expect(relativeUtils?.isRelative).toBe(true);
    expect(relativeUtils?.specifiers).toEqual(['* as utils']);

    // relative parent
    const relativeService = result.imports.find((i) => i.source === '../services/auth.service');
    expect(relativeService?.isRelative).toBe(true);
    expect(relativeService?.specifiers).toEqual(['service']);
  });

  it('extracts functions, methods, parameters, return types, and async flags', () => {
    const code = `
      export async function fetchUserData(userId: string, count: number = 10): Promise<User[]> {
        return [];
      }

      function internalHelper(x: any) {
        return x;
      }

      export const arrowCalc = (a: number, b: number): number => a + b;
    `;

    const result = parseSourceFile('src/functions.ts', code);
    expect(result.symbols.functions).toHaveLength(3);

    const fetchFn = result.symbols.functions.find((f) => f.name === 'fetchUserData');
    expect(fetchFn).toBeDefined();
    expect(fetchFn?.isAsync).toBe(true);
    expect(fetchFn?.isExported).toBe(true);
    expect(fetchFn?.parameters).toEqual(['userId', 'count']);
    expect(fetchFn?.returnType).toBe('Promise<User[]>');

    const helperFn = result.symbols.functions.find((f) => f.name === 'internalHelper');
    expect(helperFn?.isExported).toBe(false);
    expect(helperFn?.isAsync).toBe(false);

    const arrowFn = result.symbols.functions.find((f) => f.name === 'arrowCalc');
    expect(arrowFn?.isExported).toBe(true);
    expect(arrowFn?.parameters).toEqual(['a', 'b']);
    expect(arrowFn?.returnType).toBe('number');
  });

  it('extracts classes, extends, implements, methods, properties, and visibilities', () => {
    const code = `
      export class UserService extends BaseService implements IUserService, IAuditable {
        private apiKey: string;
        public static instanceCount: number = 0;

        constructor(apiKey: string) {
          super();
          this.apiKey = apiKey;
        }

        public async getUser(id: string): Promise<User> {
          return {} as User;
        }

        protected logAction(action: string): void {}
      }
    `;

    const result = parseSourceFile('src/services/UserService.ts', code);
    expect(result.symbols.classes).toHaveLength(1);

    const cls = result.symbols.classes[0]!;
    expect(cls.name).toBe('UserService');
    expect(cls.extends).toBe('BaseService');
    expect(cls.implements).toEqual(['IUserService', 'IAuditable']);
    expect(cls.isExported).toBe(true);

    // Properties
    expect(cls.properties).toHaveLength(2);
    const apiKeyProp = cls.properties.find((p) => p.name === 'apiKey');
    expect(apiKeyProp?.visibility).toBe('private');
    expect(apiKeyProp?.type).toBe('string');

    const staticProp = cls.properties.find((p) => p.name === 'instanceCount');
    expect(staticProp?.isStatic).toBe(true);
    expect(staticProp?.visibility).toBe('public');

    // Methods
    const getUserMethod = cls.methods.find((m) => m.name === 'getUser');
    expect(getUserMethod?.visibility).toBe('public');
    expect(getUserMethod?.isAsync).toBe(true);
    expect(getUserMethod?.parameters).toEqual(['id']);
    expect(getUserMethod?.returnType).toBe('Promise<User>');

    const logMethod = cls.methods.find((m) => m.name === 'logAction');
    expect(logMethod?.visibility).toBe('protected');
  });

  it('extracts interfaces and type aliases', () => {
    const code = `
      export interface AuthSession {
        accessToken: string;
        expiresIn: number;
      }

      export type UserRole = 'USER' | 'ADMIN';
      type InternalId = string | number;
    `;

    const result = parseSourceFile('src/types.ts', code);
    expect(result.symbols.types).toHaveLength(3);

    const iface = result.symbols.types.find((t) => t.name === 'AuthSession');
    expect(iface?.kind).toBe('interface');
    expect(iface?.isExported).toBe(true);

    const exportedType = result.symbols.types.find((t) => t.name === 'UserRole');
    expect(exportedType?.kind).toBe('type');
    expect(exportedType?.isExported).toBe(true);

    const internalId = result.symbols.types.find((t) => t.name === 'InternalId');
    expect(internalId?.kind).toBe('type');
    expect(internalId?.isExported).toBe(false);
  });

  it('handles malformed syntax gracefully without crashing and flags errors', () => {
    const brokenCode = `
      export function brokenFunction( {
        const x = ;
        return
    `;

    const result = parseSourceFile('src/broken.ts', brokenCode);
    expect(result.hasErrors).toBe(true);
    expect(result.parseDiagnostics).toBeDefined();
    expect(result.parseDiagnostics?.length).toBeGreaterThan(0);
    expect(result.lineCount).toBeGreaterThan(0);
  });

  it('resolves relative dependencies between intra-repository files', () => {
    const allFiles = [
      'src/index.ts',
      'src/lib/api.ts',
      'src/lib/utils.ts',
      'src/components/layout/Sidebar.tsx',
      'src/components/common/index.ts',
    ];

    expect(resolveIntraRepoDependency('src/index.ts', './lib/api', allFiles)).toBe(
      'src/lib/api.ts',
    );
    expect(
      resolveIntraRepoDependency('src/components/layout/Sidebar.tsx', '../common', allFiles),
    ).toBe('src/components/common/index.ts');
    expect(resolveIntraRepoDependency('src/index.ts', 'react', allFiles)).toBeNull();
    expect(resolveIntraRepoDependency('src/index.ts', './nonexistent', allFiles)).toBeNull();
  });
});
