import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

const YAML_CONFIG_FILENAME = `${process.env.NODE_ENV}.yaml`;

export default () => {
  return yaml.load(
    readFileSync(join(__dirname, YAML_CONFIG_FILENAME), 'utf-8'),
  ) as Record<string, any>;
};
