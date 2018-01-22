import { Publication } from '../publication'
import { Link } from '../../epub-model/publication-link';

export class PackageDocument {

    private pub: Publication;

    constructor(pub: Publication) {
        this.pub = pub;
    }

    getSharedJsPackageData(): any {
        return {
            rootUrl : '',
            rendition_viewport : '',
            rendition_layout : '',
            rendition_orientation : '',
            rendition_flow : '',
            rendition_spread : '',
            media_overlay : this.getDefaultMediaOverlay(),
            spine : {
                direction : this.getPageProgressionDirection(),
                items : this.getSharedJsSpine()
            }
        };
    }

    private getDefaultMediaOverlay(): any {
        return {
            duration: 0,
            narrator: '',
            activeClass: '',
            playbackActiveClass: '',
            smil_models: [],
            skippables: ["sidebar", "practice", "marginalia", "annotation", "help", "note", "footnote", "rearnote",
                "table", "table-row", "table-cell", "list", "list-item", "pagebreak"],
            escapables: ["sidebar", "bibliography", "toc", "loi", "appendix", "landmarks", "lot", "index",
                "colophon", "epigraph", "conclusion", "afterword", "warning", "epilogue", "foreword",
                "introduction", "prologue", "preface", "preamble", "notice", "errata", "copyright-page",
                "acknowledgments", "other-credits", "titlepage", "imprimatur", "contributors", "halftitlepage",
                "dedication", "help", "annotation", "marginalia", "practice", "note", "footnote", "rearnote",
                "footnotes", "rearnotes", "bridgehead", "page-list", "table", "table-row", "table-cell", "list",
                "list-item", "glossary"]
        };
    }


    private getPageProgressionDirection(): string {
        let pageProgressionDirection: string = this.pub.Metadata.Direction;
        if (pageProgressionDirection === "rtl") {
            return "rtl";
        }
        else if (pageProgressionDirection === "default") {
            return "default";
        }
        else {
            return "ltr";
        }
    };

    private getSharedJsSpine(): object {
        let spine = this.pub.Spine.map(function(pubSpineItem: Link) {

            var viewport = undefined;
            
            let spineItem = {
                href: pubSpineItem.Href,
                media_type: pubSpineItem.TypeLink,
                // assuming that the order of spine items in webpub indicates that they are linear
                linear: 'yes',

                // R2: these data is lost 
                rendition_viewport: viewport,
                idref: pubSpineItem.Href,
                manifest_id: '',
                media_overlay_id: '',
                properties: ''
            };

            return spineItem;
        });

        return spine;
    }
}