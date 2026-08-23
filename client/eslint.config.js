import { defineConfig } from 'eslint/config';
export default defineConfig([{files:['src/**/*.{js,jsx}'],languageOptions:{ecmaVersion:2022,sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}}},rules:{'no-unused-vars':'off'}}]);
