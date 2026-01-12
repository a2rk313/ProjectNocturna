# Light Pollution Research Guide for Project Nocturna

## Table of Contents
1. [Introduction](#introduction)
2. [Scientific Background](#scientific-background)
3. [Data Sources and Validity](#data-sources-and-validity)
4. [Research Applications](#research-applications)
5. [Methodology](#methodology)
6. [Statistical Analysis](#statistical-analysis)
7. [Citation Guidelines](#citation-guidelines)
8. [Best Practices](#best-practices)

## Introduction

Project Nocturna is designed to serve the research community with scientifically valid light pollution data and analysis tools. This guide provides researchers with the information needed to effectively use the platform for academic and scientific purposes.

## Scientific Background

### Light Pollution Metrics

Project Nocturna utilizes several standardized metrics for measuring light pollution:

- **Sky Quality Meter (SQM)**: Measures sky brightness in magnitudes per square arcsecond (mag/arcsec²)
- **Bortle Scale**: Nine-level scale for observing conditions, from Class 1 (excellent dark site) to Class 9 (inner-city skies)
- **VIIRS Radiance**: Raw radiance values from NASA's VIIRS instrument in nW·cm⁻²·sr⁻¹

### Relationship Between Metrics

The platform converts VIIRS radiance values to SQM equivalents using the empirical relationship:
```
SQM ≈ 21.8 - 0.1 × (VIIRS_radiance)^0.8
```

This conversion is based on calibration studies comparing satellite measurements with ground-based SQM readings.

## Data Sources and Validity

### Primary Data Sources

1. **NASA VIIRS Day/Night Band (DNB)**
   - Resolution: 742m at nadir
   - Coverage: Global daily
   - Temporal span: Since 2012
   - Validation: Peer-reviewed in multiple studies

2. **World Atlas of Artificial Night Sky Brightness**
   - Coverage: Global
   - Resolution: 1 km
   - Publication: Falchi et al. (2016), Science Advances

3. **Ground-based Measurements**
   - SQM-LE network data
   - Citizen science contributions
   - Research institution measurements

### Data Quality Considerations

- **Cloud Cover**: VIIRS data may have gaps during cloudy conditions
- **Moonlight**: Lunar illumination can affect measurements (typically filtered in analysis)
- **Atmospheric Conditions**: Aerosols and air quality affect light propagation
- **Sensor Calibration**: NASA applies regular calibration updates

### Uncertainty Quantification

The platform provides uncertainty estimates for all predictions:
- Standard deviation calculations
- Confidence intervals (95%)
- Model validation metrics (MAE, RMSE)
- Cross-validation results

## Research Applications

### Ecological Impact Studies

Project Nocturna provides tools to assess ecological impacts:

- **Avian Migration**: Correlation between light pollution and migration patterns
- **Insect Populations**: Effect of artificial lighting on nocturnal insects
- **Plant Physiology**: Disruption of circadian rhythms in plants
- **Sea Turtle Nesting**: Impact on hatchling orientation
- **Bat Foraging**: Effects on nocturnal mammal behavior

### Urban Planning and Policy

- **Lighting Ordinance Evaluation**: Assess effectiveness of lighting regulations
- **Energy Efficiency**: Quantify energy waste from excessive lighting
- **Public Health**: Correlation studies between light pollution and health outcomes
- **Environmental Justice**: Distribution of light pollution across communities

### Climate and Atmospheric Research

- **Aerosol Studies**: Correlation between light scattering and air quality
- **Weather Patterns**: Relationship between urban lighting and local climate
- **Remote Sensing Validation**: Ground-truth data for satellite measurements

## Methodology

### Data Access Methods

#### 1. REST API Access
```javascript
// Example: Get VIIRS data for a specific year
fetch('/api/viirs/2023?bbox=minLon,minLat,maxLon,maxLat')
  .then(response => response.json())
  .then(data => console.log(data));
```

#### 2. Batch Processing
For large-scale studies, use the regional statistics endpoint:
```javascript
// Example: Get statistics for a specific region
fetch('/api/statistics/region', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    geometry: {
      type: 'Polygon',
      coordinates: [[[lon1, lat1], [lon2, lat2], ...]]
    },
    year: 2023
  })
})
.then(response => response.json());
```

### Data Processing Pipeline

1. **Data Retrieval**: Pull from NASA APIs, databases, and ground networks
2. **Quality Control**: Apply filters for clouds, moonlight, and atmospheric conditions
3. **Normalization**: Convert to standard units (SQM, Bortle scale)
4. **Spatial Analysis**: Apply geographic patterns and interpolation
5. **Statistical Processing**: Calculate means, variances, and trends
6. **Output Generation**: Format for research publication

### Trend Analysis Methods

Project Nocturna implements multiple analytical approaches:

#### Linear Regression
- **Method**: Ordinary Least Squares (OLS)
- **Application**: Long-term linear trends
- **Validation**: R² coefficient and confidence intervals

#### Time Series Analysis
- **Methods**: Exponential smoothing, moving averages
- **Application**: Short-term fluctuations and seasonality
- **Validation**: Cross-validation and residual analysis

#### Machine Learning Models
- **Approaches**: Ensemble methods combining multiple algorithms
- **Features**: Geographic, temporal, and demographic variables
- **Validation**: Leave-one-out cross-validation

## Statistical Analysis

### Descriptive Statistics

The platform calculates comprehensive descriptive statistics:

- **Central Tendency**: Mean, median, mode of SQM values
- **Dispersion**: Standard deviation, variance, range
- **Distribution Shape**: Skewness, kurtosis
- **Percentiles**: 25th, 75th, 90th percentiles

### Inferential Statistics

For hypothesis testing and correlation analysis:

- **Correlation Coefficients**: Pearson, Spearman rank correlations
- **Regression Analysis**: Multiple linear and polynomial regression
- **ANOVA**: Analysis of variance for group comparisons
- **Non-parametric Tests**: Mann-Whitney U, Kruskal-Wallis tests

### Spatial Statistics

- **Moran's I**: Spatial autocorrelation measure
- **Getis-Ord Gi***: Hot spot analysis for clustering
- **Semivariogram**: Spatial dependence modeling
- **Kernel Density Estimation**: Smoothed spatial distribution maps

## Citation Guidelines

### Platform Citation

When using Project Nocturna in research publications, please cite:

> Project Nocturna Team (2024). Project Nocturna: Real-time Light Pollution Monitoring Platform. Available at: https://github.com/a2rk313/ProjectNocturna

### Data Source Citations

Include citations for the underlying data sources:

#### NASA Data
```
NASA EOSDIS FIRMS (Fire Information for Resource Management System). 
Available at https://firms.modaps.eosdis.nasa.gov/

Elvidge, C.D., Baugh, K.E., Zhizhin, M., Hsu, F.C., Ghosh, T. (2013). 
A fifteen year record of global natural gas flaring derived from satellite data. 
Energies 6(11), 5946-5967.
```

#### World Atlas Data
```
Falchi, F., Cinzano, P., Duriscoe, D., Kyba, C. C. M., Elvidge, C. D., 
Baugh, K., Portnov, B. A., Rybnikova, N. A., & Furgoni, R. (2016). 
The new world atlas of artificial night sky brightness. 
Science Advances, 2(6), e1600377.
```

#### Additional Citations
```
Kyba, C.C.M., Kuester, T., Sánchez de Miguel, A., Baugh, K., Jechow, A., 
Levin, N., Kyba, G., Ruhtz, T., Fischer, J., Hoffmann, L., Hänel, A., 
Drepper, S., Matzke, T., Dörrenberg, K., Hellmers, H., Meier, J., 
Matlabi, P., & Wiedemann, N. (2021). Artificially lit surface of Earth at 
night increasing in radiance and extent. Science Advances, 7(9), eabd4405.
```

### Methodology Citations

For predictive analytics and statistical methods:

```
Box, G.E.P., Jenkins, G.M. (1970). Time Series Analysis: Forecasting and Control
Hyndman, R.J., Athanasopoulos, G. (2021). Forecasting: Principles and Practice
```

## Best Practices

### Research Design

1. **Define Clear Objectives**: Specify research questions and hypotheses before data collection
2. **Select Appropriate Metrics**: Choose SQM, Bortle, or radiance based on research goals
3. **Consider Temporal Scope**: Account for seasonal and annual variations
4. **Account for Confounding Factors**: Consider geography, weather, and atmospheric conditions

### Data Quality Assurance

1. **Validate Geographic Coordinates**: Ensure coordinate accuracy and datum consistency
2. **Check Data Completeness**: Identify and address missing or incomplete data
3. **Assess Temporal Consistency**: Account for sensor calibration changes over time
4. **Cross-validate Results**: Compare with independent datasets when possible

### Statistical Rigor

1. **Document Methodology**: Clearly describe all analytical procedures
2. **Report Uncertainties**: Include confidence intervals and error estimates
3. **Test Assumptions**: Validate statistical model assumptions
4. **Control for Multiple Testing**: Apply corrections when conducting multiple comparisons

### Reproducibility

1. **Version Control**: Document the platform version used
2. **Parameter Documentation**: Record all analysis parameters
3. **Code Sharing**: Share analytical scripts when possible
4. **Data Preservation**: Archive datasets for future verification

### Ethical Considerations

1. **Data Privacy**: Protect citizen science contributor privacy
2. **Environmental Justice**: Consider equitable distribution of light pollution impacts
3. **Community Engagement**: Involve local communities in research applications
4. **Policy Implications**: Consider real-world applications of findings

---

This guide provides researchers with the essential information needed to utilize Project Nocturna effectively for scientific light pollution research. The platform is designed to support rigorous academic inquiry while maintaining scientific integrity and reproducibility.