import { tool } from 'ai';

import { WrappedToolProps } from '.';
import { jinaTools } from '../generic/jina';

const readWebPage = () => {
  const metadata = {
    description: jinaTools.readWebPage.description,
    parameters: jinaTools.readWebPage.parameters,
    requiredEnvVars: ['JINA_API_KEY'],
  };
  const buildTool = (props: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({ url }: { url: string }) => {
        return await jinaTools.readWebPage.execute({ url });
      },
    });

  return {
    metadata,
    buildTool,
  };
};

export const allJinaTools = {
  readWebPage: readWebPage(),
};
