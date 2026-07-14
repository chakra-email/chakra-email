const exportChecks = new Map([
  ['@chakra-email/core', ['Blockquote', 'Button', 'Code', 'Table', 'ThemeProvider', 'render']],
  ['@chakra-email/core/components', ['Blockquote', 'Button', 'Code', 'Pre', 'Table', 'Text']],
  ['@chakra-email/core/components/Blockquote', ['Blockquote']],
  ['@chakra-email/core/components/Button', ['Button']],
  ['@chakra-email/core/components/Code', ['Code']],
  ['@chakra-email/core/components/Pre', ['Pre']],
  ['@chakra-email/core/components/Table', ['Table', 'TableCell', 'TableHeader']],
  ['@chakra-email/core/render', ['render', 'renderPlainText']],
  ['@chakra-email/core/system', ['mapChakraPropsToStyles']],
  ['@chakra-email/core/theme', ['ThemeProvider', 'mergeTheme']],
  ['chakra-email', ['Blockquote', 'Button', 'ChakraEmailProvider', 'Code', 'Table', 'render']],
  ['chakra-email/components', ['Blockquote', 'Button', 'Code', 'Pre', 'Table', 'Text']],
  ['chakra-email/render', ['render', 'renderPlainText']],
  ['chakra-email/system', ['mapChakraPropsToStyles']],
  ['chakra-email/theme', ['ChakraEmailProvider', 'createChakraV3EmailTheme']],
  ['@chakra-email/chakra-v2', ['Blockquote', 'Button', 'ChakraEmailV2Provider', 'Code', 'Table', 'render']],
  ['@chakra-email/chakra-v2/components', ['Blockquote', 'Button', 'Code', 'Pre', 'Table', 'Text']],
  ['@chakra-email/chakra-v2/render', ['render', 'renderPlainText']],
  ['@chakra-email/chakra-v2/system', ['mapChakraPropsToStyles']],
  [
    '@chakra-email/chakra-v2/theme',
    ['ChakraEmailV2Provider', 'createChakraV2EmailTheme'],
  ],
]);

const failures = [];

for (const [specifier, expectedExports] of exportChecks) {
  try {
    const moduleExports = await import(specifier);
    const missingExports = expectedExports.filter(
      (exportName) => !(exportName in moduleExports)
    );

    if (missingExports.length > 0) {
      failures.push(`${specifier}: missing ${missingExports.join(', ')}`);
      continue;
    }

    console.log(`ok ${specifier}`);
  } catch (error) {
    failures.push(`${specifier}: ${error.code ?? error.name} ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error('Built export smoke test failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
}
