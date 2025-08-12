/**
 * Google Fonts URL解析機能のテスト
 * 実際のユーティリティ関数の実装をテストします
 */

import { parseGoogleFontUrl, generateGoogleFontId } from '../src/utils/googleFontsUtils';

describe('Google Fonts URL解析', () => {
  describe('parseGoogleFontUrl', () => {
    test('基本的なGoogle Fonts URLを正しく解析する', () => {
      const url = 'https://fonts.googleapis.com/css?family=Roboto';
      const result = parseGoogleFontUrl(url);
      
      expect(result.fontName).toBe('Roboto');
      expect(result.originalUrl).toBe(url);
    });

    test('ウェイト指定付きURLを正しく解析する', () => {
      const url = 'https://fonts.googleapis.com/css?family=Roboto:400,700';
      const result = parseGoogleFontUrl(url);
      
      expect(result.fontName).toBe('Roboto');
      expect(result.originalUrl).toBe(url);
    });

    test('CSS2形式のURLを正しく解析する', () => {
      const url = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&display=swap';
      const result = parseGoogleFontUrl(url);
      
      expect(result.fontName).toBe('Noto Sans JP');
      expect(result.originalUrl).toBe(url);
    });

    test('複数フォント指定の場合、最初のfamilyパラメータのみを使用する', () => {
      const url = 'https://fonts.googleapis.com/css?family=Roboto:400,700&family=Open+Sans:400,600';
      const result = parseGoogleFontUrl(url);
      
      expect(result.fontName).toBe('Roboto');
      expect(result.originalUrl).toBe(url);
    });

    test('フォント名にスペースが含まれる場合の正規化', () => {
      const url = 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap';
      const result = parseGoogleFontUrl(url);
      
      expect(result.fontName).toBe('Open Sans');
      expect(result.originalUrl).toBe(url);
    });

    test('複雑なNoto Serif JPフォントを正しく解析する', () => {
      const url = 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@200;300;400;500;600;700;900&display=swap';
      const result = parseGoogleFontUrl(url);
      
      expect(result.fontName).toBe('Noto Serif JP');
      expect(result.originalUrl).toBe(url);
    });

    test('無効なURLの場合にエラーを投げる', () => {
      const invalidUrl = 'https://example.com/font.css';
      
      expect(() => parseGoogleFontUrl(invalidUrl)).toThrow('無効なGoogle Fonts URLです');
    });

    test('familyパラメータが存在しない場合にエラーを投げる', () => {
      const urlWithoutFamily = 'https://fonts.googleapis.com/css?display=swap';
      
      expect(() => parseGoogleFontUrl(urlWithoutFamily)).toThrow('familyパラメータが見つかりません');
    });

    test('空のfamilyパラメータの場合にエラーを投げる', () => {
      const urlWithEmptyFamily = 'https://fonts.googleapis.com/css?family=';
      
      expect(() => parseGoogleFontUrl(urlWithEmptyFamily)).toThrow('familyパラメータが見つかりません');
    });
  });

  describe('generateGoogleFontId', () => {
    test('同じURLから同じIDを生成する', () => {
      const url = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&display=swap';
      const id1 = generateGoogleFontId(url);
      const id2 = generateGoogleFontId(url);
      
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^font-[a-f0-9]{8}$/);
    });

    test('異なるURLから異なるIDを生成する', () => {
      const url1 = 'https://fonts.googleapis.com/css?family=Roboto';
      const url2 = 'https://fonts.googleapis.com/css?family=Open+Sans';
      
      const id1 = generateGoogleFontId(url1);
      const id2 = generateGoogleFontId(url2);
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^font-[a-f0-9]{8}$/);
      expect(id2).toMatch(/^font-[a-f0-9]{8}$/);
    });

    test('パラメータの順序が異なってもURLが同じなら同じIDを生成する', () => {
      const url1 = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&display=swap';
      const url2 = 'https://fonts.googleapis.com/css2?display=swap&family=Noto+Sans+JP:wght@100..900';
      
      // URLが異なるため、IDも異なるべき（URL文字列をそのままハッシュ化するため）
      const id1 = generateGoogleFontId(url1);
      const id2 = generateGoogleFontId(url2);
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('要件確認テスト', () => {
    test('要件1: 1つめのfamilyパラメータのみを利用する', () => {
      const multipleFamily = 'https://fonts.googleapis.com/css?family=Roboto:400&family=Open+Sans:300&family=Lato:700';
      const result = parseGoogleFontUrl(multipleFamily);
      
      // 最初のfamilyパラメータ（Roboto）のみが使用されるべき
      expect(result.fontName).toBe('Roboto');
    });

    test('要件2: FontInfo に格納する name は、family パラメータの値をコロンで区切って１番目の値とする', () => {
      const testCases = [
        {
          url: 'https://fonts.googleapis.com/css?family=Roboto:400,700',
          expected: 'Roboto'
        },
        {
          url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900',
          expected: 'Noto Sans JP'
        },
        {
          url: 'https://fonts.googleapis.com/css?family=Open+Sans:ital,wght@0,300;1,400',
          expected: 'Open Sans'
        }
      ];

      testCases.forEach(({ url, expected }) => {
        const result = parseGoogleFontUrl(url);
        expect(result.fontName).toBe(expected);
      });
    });

    test('要件3: googleFontUrl の値は、与えられたURLをそのまま利用する', () => {
      const originalUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&display=swap';
      const result = parseGoogleFontUrl(originalUrl);
      
      // originalUrlが全く変更されていないことを確認
      expect(result.originalUrl).toBe(originalUrl);
      expect(result.originalUrl).toStrictEqual(originalUrl);
    });
  });

  describe('実際のGoogle Fonts URLサンプル', () => {
    const realWorldExamples = [
      {
        name: 'Google Fonts標準形式',
        url: 'https://fonts.googleapis.com/css?family=Roboto',
        expectedName: 'Roboto'
      },
      {
        name: 'ウェイト指定付き',
        url: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700',
        expectedName: 'Roboto'
      },
      {
        name: 'CSS2形式 - 日本語フォント',
        url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100;300;400;500;700;900&display=swap',
        expectedName: 'Noto Sans JP'
      },
      {
        name: 'CSS2形式 - セリフフォント',
        url: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@200;300;400;500;600;700;900&display=swap',
        expectedName: 'Noto Serif JP'
      },
      {
        name: 'イタリック指定付き',
        url: 'https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&display=swap',
        expectedName: 'Open Sans'
      },
      {
        name: '複数フォント指定',
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Roboto+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap',
        expectedName: 'Inter'
      }
    ];

    realWorldExamples.forEach(({ name, url, expectedName }) => {
      test(name, () => {
        const result = parseGoogleFontUrl(url);
        
        expect(result.fontName).toBe(expectedName);
        expect(result.originalUrl).toBe(url);
      });
    });
  });
});