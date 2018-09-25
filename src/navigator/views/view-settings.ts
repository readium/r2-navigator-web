import { ISettingEntry, SettingName } from './types';

interface IReadiumCSSSettingValueConverter {
  name: string;
  // tslint:disable-next-line:prefer-method-signature no-any
  converter: (val: any) => string;
}

function stringConverter(value: string): string {
  return value;
}

// tslint:disable-next-line:no-any
function genericConverter(value: any): string {
  return `${value}`;
}

function percentConverter(value: number): string {
  return `${value}%`;
}

const READIUM_CSS_VAR_MAP: Map<string, IReadiumCSSSettingValueConverter> = new Map([
  [SettingName.FontSize, { name:'--USER__fontSize', converter: percentConverter }],
  [SettingName.FontFamily, { name:'--USER__fontFamily', converter: stringConverter }],
  [SettingName.ReadingMode, { name:'--USER__appearance', converter: stringConverter }],
  [SettingName.TextColor, { name: '--USER__textColor', converter: stringConverter }],
  [SettingName.BackgroundColor, { name: '--USER__backgroundColor', converter: stringConverter }],
]);

export class ViewSettings {
  // tslint:disable-next-line:no-any
  private settings: Map<SettingName, any> = new Map();

  public getAllSettings(): ISettingEntry[]  {
    const ret: ISettingEntry[] = [];
    this.settings.forEach((value, name) => {
      ret.push({ name, value });
    });

    return ret;
  }

  public updateSetting(newSettings: ISettingEntry[]): void {
    for (const s of newSettings) {
      this.settings.set(s.name, s.value);
    }
  }

  public updateView(view: HTMLElement): void {
    this.settings.forEach((val, name) => {
      this.setCss(view, name, val);
    });
  }

  public getSetting<T>(name: SettingName): T | undefined {
    const val = this.settings.get(name);
    if (val === undefined) {
      return undefined;
    }

    return <T>(val);
  }

  // tslint:disable-next-line:no-any
  private setCss(view: HTMLElement, varName: string, varVal: any): void {
    const cssConverter = READIUM_CSS_VAR_MAP.get(varName);
    if (cssConverter) {
      view.style.setProperty(cssConverter.name, cssConverter.converter(varVal));
    }
  }

}
