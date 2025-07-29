import { getCustomProtocolUrl } from './imageUtils';
import { generateSvgStructureCommon } from '../../utils/svgGeneratorCommon';
import type { ProjectData, AssetInstance } from '../../types/entities';

/**
 * レンダラープロセス用のSVG構造生成関数
 * 共通ロジックをラップしてカスタムプロトコルURLを提供
 */
export function generateSvgStructure(
  project: ProjectData, 
  instances: AssetInstance[], 
  projectPath: string | null
): { assetDefinitions: string[]; useElements: string[] } {
  return generateSvgStructureCommon(project, instances, (filePath: string) => {
    return getCustomProtocolUrl(filePath, projectPath);
  });
}