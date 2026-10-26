import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Allow NodeNext-style ".js" imports to resolve to .ts/.tsx source for the bundler.
Config.overrideWebpackConfig((config) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      extensionAlias: {
        ...(config.resolve?.extensionAlias ?? {}),
        ".js": [".ts", ".tsx", ".js", ".jsx"],
      },
    },
  };
});