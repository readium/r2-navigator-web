import { ISettingEntry, SettingName } from './types';

interface IReadiumCSSSettingValueConverter {
  name: string;
  // tslint:disable-next-line:prefer-method-signature no-any
  valueConverter: (val: any) => string;
}

function stringValueConverter(value: string): string {
  return value;
}

// tslint:disable-next-line:no-any
function genericValueConverter(value: any): string {
  return `${value}`;
}

function percentValueConverter(value: number): string {
  return `${value}%`;
}

export class ViewSettings {
  private readonly READIUM_CSS_VAR_MAP: Map<string, IReadiumCSSSettingValueConverter> = new Map([
    [SettingName.ColumnGap, { name: 'column-gap', valueConverter: genericValueConverter }],
    [SettingName.FontSize, { name:'--RS__baseFontSize', valueConverter: percentValueConverter }],
  ]);

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

  // tslint:disable-next-line:no-any
  private setCss(view: HTMLElement, varName: string, varVal: any): void {
    const cssConverter = this.READIUM_CSS_VAR_MAP.get(varName);
    if (cssConverter) {
      view.style.setProperty(cssConverter.name, cssConverter.valueConverter(varVal));
    }
  }

}
