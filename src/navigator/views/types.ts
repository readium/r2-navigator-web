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
  MaxColumnWidth = 'column-max', // number,
  MinColumnWidth = 'column-min', // number,
  SpreadMode = 'spread-mode', // string
  FontFamily = 'font-family', // string
  FontSize = 'font-size', // number
  ReadingMode = 'reading-mode', // string
  TextColor = 'text-color', // string
  BackgroundColor = 'background-color', // string
  TextAlign = 'text-align', // string
  FontOverride = 'font-override', // string
  AdvancedSettings = 'advanced-settings', // string
  LineHeight = 'line-height', // number
  FontSelection = 'fontSelection', // string or number?
}

export interface ISettingEntry {
  name: SettingName;
  // tslint:disable-next-line:no-any
  value: any;
}

const SETTING_NAME_MAP: Map<string, SettingName> = new Map([
  [SettingName.AdvancedSettings, SettingName.AdvancedSettings],
  [SettingName.BackgroundColor, SettingName.BackgroundColor],
  [SettingName.ColumnGap, SettingName.ColumnGap],
  [SettingName.LineHeight, SettingName.LineHeight],
  [SettingName.MaxColumnWidth, SettingName.MaxColumnWidth],
  [SettingName.MinColumnWidth, SettingName.MinColumnWidth],
  [SettingName.FontFamily, SettingName.FontFamily],
  [SettingName.FontOverride, SettingName.FontOverride],
  [SettingName.FontSize, SettingName.FontSize],
  [SettingName.ReadingMode, SettingName.ReadingMode],
  [SettingName.SpreadMode, SettingName.SpreadMode],
  [SettingName.TextAlign, SettingName.TextAlign],
  [SettingName.TextColor, SettingName.TextColor],
  [SettingName.FontSelection, SettingName.FontSelection],
]);

export function stringToSettingName(val: string): SettingName | undefined {
  return SETTING_NAME_MAP.get(val);
}
