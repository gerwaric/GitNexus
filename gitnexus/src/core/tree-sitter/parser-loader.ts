import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
import Java from 'tree-sitter-java';
import C from 'tree-sitter-c';
import CPP from 'tree-sitter-cpp';
import CSharp from 'tree-sitter-c-sharp';
import Go from 'tree-sitter-go';
import Rust from 'tree-sitter-rust';
import Kotlin from 'tree-sitter-kotlin';
import PHP from 'tree-sitter-php';
import Fortran from 'tree-sitter-fortran';
import Cobol from 'tree-sitter-cobol';
import { createRequire } from 'node:module';
import { SupportedLanguages } from '../../config/supported-languages.js';

// tree-sitter-swift is an optionalDependency — may not be installed
const _require = createRequire(import.meta.url);
let Swift: any = null;
try { Swift = _require('tree-sitter-swift'); } catch {}

let parser: Parser | null = null;

const languageMap: Record<string, any> = {
  [SupportedLanguages.JavaScript]: JavaScript,
  [SupportedLanguages.TypeScript]: TypeScript.typescript,
  [`${SupportedLanguages.TypeScript}:tsx`]: TypeScript.tsx,
  [SupportedLanguages.Python]: Python,
  [SupportedLanguages.Java]: Java,
  [SupportedLanguages.C]: C,
  [SupportedLanguages.CPlusPlus]: CPP,
  [SupportedLanguages.CSharp]: CSharp,
  [SupportedLanguages.Go]: Go,
  [SupportedLanguages.Rust]: Rust,
  [SupportedLanguages.Kotlin]: Kotlin,
  [SupportedLanguages.PHP]: PHP.php_only,
  [SupportedLanguages.Fortran]: Fortran,
  [SupportedLanguages.Cobol]: Cobol,
  ...(Swift ? { [SupportedLanguages.Swift]: Swift } : {}),
};

export const isLanguageAvailable = (language: SupportedLanguages): boolean =>
  language in languageMap;

export const loadParser = async (): Promise<Parser> => {
  if (parser) return parser;
  parser = new Parser();
  return parser;
};

export const loadLanguage = async (language: SupportedLanguages, filePath?: string): Promise<void> => {
  if (!parser) await loadParser();
  const key = language === SupportedLanguages.TypeScript && filePath?.endsWith('.tsx')
    ? `${language}:tsx`
    : language;

  const lang = languageMap[key];
  if (!lang) {
    throw new Error(`Unsupported language: ${language}`);
  }
  try {
    parser!.setLanguage(lang);
  } catch (err) {
    if (language === SupportedLanguages.Fortran && err instanceof TypeError) {
      throw new Error(
        'Fortran grammar failed to load: the installed tree-sitter-fortran was built for tree-sitter 0.26, but this project uses tree-sitter ^0.21 (ABI mismatch). ' +
        'Use a 0.21-compatible grammar: install tree-sitter-fortran at v0.1.0 (e.g. "tree-sitter-fortran": "github:stadelmanma/tree-sitter-fortran#v0.1.0" in package.json) and run npm install. ' +
        'See docs/design/tree-sitter-upgrade-notes.md and docs/design/fortran-support.md.'
      );
    }
    if (language === SupportedLanguages.Cobol && err instanceof TypeError) {
      throw new Error(
        'COBOL grammar failed to load. Ensure tree-sitter-cobol is vendored and built (see gitnexus/scripts/vendor-tree-sitter-cobol.sh and docs/design/tree-sitter-cobol-notes.md).'
      );
    }
    throw err;
  }
};
