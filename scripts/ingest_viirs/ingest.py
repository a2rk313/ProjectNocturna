#!/usr/bin/env python3
"""
Project Nocturna - VIIRS raster ingestion scaffold (Option A).

This is intentionally a scaffold: real VIIRS acquisition differs by product
(NASA/NOAA providers, auth tokens, formats like HDF5/NetCDF, etc.).

What this script DOES provide:
- A repeatable "output contract" for GeoServer-readable GeoTIFF placement
- Provenance metadata sidecar (JSON) so results are scientifically auditable
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class Provenance:
    product: str
    year: int
    created_at_utc: str
    source: str
    notes: str


def write_provenance(out_path: Path, prov: Provenance) -> None:
    prov_path = out_path.with_suffix(out_path.suffix + ".provenance.json")
    prov_path.write_text(json.dumps(asdict(prov), indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="VIIRS raster ingestion scaffold")
    parser.add_argument("--year", type=int, required=True, help="Target year (e.g., 2023)")
    parser.add_argument(
        "--output-root",
        type=str,
        default=str(Path(__file__).resolve().parents[2] / "data" / "rasters"),
        help="Root folder for processed rasters (default: repo data/rasters)",
    )
    parser.add_argument(
        "--source",
        type=str,
        default="TBD (configure actual NASA/NOAA VIIRS product source)",
        help="Human-readable source string for provenance",
    )
    parser.add_argument(
        "--notes",
        type=str,
        default="Scaffold output (no real download performed). Replace with real acquisition + processing.",
        help="Extra provenance notes",
    )
    args = parser.parse_args()

    out_dir = Path(args.output_root) / "viirs" / "nightly_lights" / str(args.year)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Placeholder artifact so GeoServer publishing can be tested with a sample raster you provide.
    # Replace this with real processing output (GeoTIFF).
    placeholder = out_dir / f"VIIRS_Night_Lights_{args.year}__PLACEHOLDER.txt"
    placeholder.write_text(
        "\n".join(
            [
                "This is a placeholder file.",
                "Replace with a GeoTIFF produced by your VIIRS ingestion pipeline.",
                "GeoServer mount inside container: /opt/nocturna_rasters",
                "",
            ]
        ),
        encoding="utf-8",
    )

    prov = Provenance(
        product="VIIRS Nighttime Lights (raster)",
        year=int(args.year),
        created_at_utc=datetime.now(timezone.utc).isoformat(),
        source=args.source,
        notes=args.notes,
    )
    write_provenance(placeholder, prov)

    print(f"Wrote placeholder artifact: {placeholder}")
    print("Next: replace with a GeoTIFF and publish via GeoServer (see docs/geoserver_publish_viirs.md).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

