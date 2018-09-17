export enum ZoomOptions {
  FitByWidth,
  FitByHeight,
  FitByPage,
}

export class CancellationToken {
  public isCancelled: boolean = false;
}

export enum SettingName {
  ColumnGap = 'column-gap', // number,
  SpreadMode = 'spread-mode', // string
  FontFamily = 'font-family', // string
  FontSize = 'font-size', // number
  ReadingMode = 'reading-mode', // string
  TextColor = 'text-color', // string
  BackgroundColor = 'background-color', // string
  TextAlign = 'text-align', // string
}

export interface ISettingEntry {
  name: SettingName;
  // tslint:disable-next-line:no-any
  value: any;
}
