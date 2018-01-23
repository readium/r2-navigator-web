export class Location {
    private cfi: string;
    private href: string;
    private isPrecise: boolean;

    constructor(cfi: string, href: string, isPrecise:boolean = true) {
        this.cfi = cfi;
        this.href = href;
        this.isPrecise = isPrecise;
    }

    getLocation(): string {
        return this.cfi;
    }

    getHref(): string {
        return this.href;
    }

    getLocationPrecision(): boolean {
        return this.isPrecise;
    }
}