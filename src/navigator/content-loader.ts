export enum ContentType {
  Html,
}

export interface ILoaderConfig {}

export interface IContentLoader {
  loadContent(
    // tslint:disable-next-line:no-any
    target: any,
    src: string,
    // tslint:disable-next-line:no-any
    callback: any,
    // tslint:disable-next-line:no-any
    attachedData: any,
  ): void;

  setConfig(config: ILoaderConfig): void;

  contentType(): ContentType;

  addContentLoadedListener(listener: Function): void;

  addContentUnloadedListener(listener: Function): void;
}
