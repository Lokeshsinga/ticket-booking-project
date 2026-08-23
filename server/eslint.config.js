import { defineConfig } from 'eslint/config';
export default defineConfig([{files:['src/**/*.js'],languageOptions:{ecmaVersion:2022,sourceType:'module'},rules:{'no-unused-vars':['error',{argsIgnorePattern:'^_'}]}}]);
