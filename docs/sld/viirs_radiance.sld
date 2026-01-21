<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
    xmlns="http://www.opengis.net/sld"
    xmlns:ogc="http://www.opengis.net/ogc"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>viirs_radiance_ramp</Name>
    <UserStyle>
      <Title>VIIRS Radiance Ramp (dark-to-bright)</Title>
      <Abstract>Color ramp for VIIRS Nighttime Lights radiance values (nW/cm²/sr)</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <Opacity>0.8</Opacity>
            <ColorMap type="ramp">
              <!-- Adjust these stops to your raster's min/max; these defaults suit many VNP46A2 scenes -->
              <ColorMapEntry color="#0b1026" quantity="0" label="0 nW/cm²/sr" opacity="0.0"/>
              <ColorMapEntry color="#1e2a50" quantity="1" label="~1" opacity="0.35"/>
              <ColorMapEntry color="#22496b" quantity="3" label="~3" opacity="0.5"/>
              <ColorMapEntry color="#2f7e91" quantity="7" label="~7" opacity="0.65"/>
              <ColorMapEntry color="#58b2a8" quantity="15" label="~15" opacity="0.8"/>
              <ColorMapEntry color="#a0d995" quantity="30" label="~30" opacity="0.9"/>
              <ColorMapEntry color="#f2e26b" quantity="60" label="~60" opacity="0.95"/>
              <ColorMapEntry color="#f9a31a" quantity="120" label="~120" opacity="0.98"/>
              <ColorMapEntry color="#ef4e22" quantity="240" label="~240" opacity="1.0"/>
              <ColorMapEntry color="#ffffff" quantity="500" label="500+" opacity="1.0"/>
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>

