import { generateUniqueValueAssetName, createValueAsset } from '../src/types/entities';
import { mockProject } from './fixtures/sampleProject';

describe('ValueAsset Naming', () => {
  test('generateUniqueValueAssetName generates value_1 for empty project', () => {
    const name = generateUniqueValueAssetName(null);
    expect(name).toBe('value_1');
  });

  test('generateUniqueValueAssetName generates value_1 for project with no ValueAssets', () => {
    const project = { ...mockProject, assets: {} };
    const name = generateUniqueValueAssetName(project);
    expect(name).toBe('value_1');
  });

  test('generateUniqueValueAssetName increments correctly with existing ValueAssets', () => {
    const project = { ...mockProject };
    
    // Add some ValueAssets
    project.assets['value1'] = createValueAsset({
      name: 'value_1',
      value_type: 'string',
      initial_value: 'test',
      new_page_behavior: 'reset',
    });
    
    project.assets['value2'] = createValueAsset({
      name: 'value_3', // Skip value_2 to test gap handling
      value_type: 'string',
      initial_value: 'test',
      new_page_behavior: 'reset',
    });
    
    // Should generate value_2 (the missing one)
    const name = generateUniqueValueAssetName(project);
    expect(name).toBe('value_2');
  });

  test('generateUniqueValueAssetName handles non-ValueAsset types correctly', () => {
    const project = {
      ...mockProject,
      assets: {
        'image1': {
          id: 'image1',
          type: 'ImageAsset',
          name: 'value_1', // Should not interfere with ValueAsset naming
        }
      }
    };
    
    const name = generateUniqueValueAssetName(project as any);
    expect(name).toBe('value_1'); // Should ignore non-ValueAsset types
  });

  test('generateUniqueValueAssetName supports custom baseName', () => {
    const name = generateUniqueValueAssetName(null, 'custom');
    expect(name).toBe('custom_1');
  });

  test('createValueAsset generates unique name when not provided', () => {
    const project = { ...mockProject, assets: {} };
    
    const asset = createValueAsset({
      value_type: 'string',
      initial_value: 'test',
      new_page_behavior: 'reset',
      project: project,
    });
    
    expect(asset.name).toBe('value_1');
    expect(asset.type).toBe('ValueAsset');
  });

  test('createValueAsset uses provided name when specified', () => {
    const asset = createValueAsset({
      name: 'custom_name',
      value_type: 'string',
      initial_value: 'test',
      new_page_behavior: 'reset',
    });
    
    expect(asset.name).toBe('custom_name');
  });
});