export enum ZoomOptions {
  FitByWidth,
  FitByHeight,
  FitByPage,
}

export class CancellationToken {
  public isCancelled: boolean = false;
}

export enum SettingName {
  ColumnGap = 'column-gap',
  FontSize = 'font-size',
}

export interface ISettingEntry {
  name: SettingName;
  // tslint:disable-next-line:no-any
  value: any;
}
