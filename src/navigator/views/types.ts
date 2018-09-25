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

const SETTING_NAME_MAP: Map<string, SettingName> = new Map([
  [SettingName.BackgroundColor, SettingName.BackgroundColor],
  [SettingName.ColumnGap, SettingName.ColumnGap],
  [SettingName.FontFamily, SettingName.FontFamily],
  [SettingName.FontSize, SettingName.FontSize],
  [SettingName.ReadingMode, SettingName.ReadingMode],
  [SettingName.SpreadMode, SettingName.SpreadMode],
  [SettingName.TextAlign, SettingName.TextAlign],
  [SettingName.TextColor, SettingName.TextColor],
]);

export function stringToSettingName(val: string): SettingName | undefined {
  return SETTING_NAME_MAP.get(val);
}
