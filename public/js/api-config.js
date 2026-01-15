// js/api-config.js - API Configuration for Real Data
class APIConfig {
    constructor() {
        this.baseUrl = window.AppConfig ? window.AppConfig.apiBaseUrl : '/api';
        this.endpoints = {
            // Core Data Endpoints
            stations: '/api/stations',
            measurement: '/api/measurement',
            viirs: '/api/viirs',
            sqmNetwork: '/api/sqm-network',
            worldAtlas: '/api/world-atlas',
            darkSkyParks: '/api/dark-sky-parks',
            
            // Analysis Endpoints
            statistics: '/api/statistics/region',
            trends: '/api/trends',
            ecology: '/api/ecology/impact',
            energy: '/api/energy/waste'
        };
        
        this.dataSources = {
            nasaVIIRS: {
                name: 'NASA VIIRS Nighttime Lights',
                description: 'Visible Infrared Imaging Radiometer Suite Day/Night Band',
                resolution: '750m',
                temporal: 'Daily since 2012',
                citation: 'NASA Earth Observatory, VIIRS Day/Night Band'
            },
            worldAtlas: {
                name: 'World Atlas of Artificial Night Sky Brightness',
                description: 'Global light pollution model',
                resolution: '1km',
                temporal: '2016 baseline',
                citation: 'Falchi et al. (2016) Science Advances'
            },
            sqmNetwork: {
                name: 'SQM-LE Network',
                description: 'Global ground-based measurements',
                resolution: 'Point locations',
                temporal: 'Real-time',
                citation: 'Global SQM-LE Network'
            },
            idaParks: {
                name: 'International Dark-Sky Association',
                description: 'Certified dark sky places',
                resolution: 'Polygon boundaries',
                temporal: 'Updated monthly',
                citation: 'IDA Dark Sky Place Program'
            }
        };
    }

    getEndpoint(name, params = {}) {
        let endpoint = this.endpoints[name];
        if (!endpoint) return null;
        
        // Replace parameters in endpoint URL
        if (params) {
            Object.keys(params).forEach(key => {
                endpoint = endpoint.replace(`{${key}}`, params[key]);
            });
        }
        
        return endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    }

    getDataSourceInfo(sourceName) {
        return this.dataSources[sourceName] || {
            name: 'Unknown Source',
            description: 'No information available'
        };
    }

    getAllDataSources() {
        return Object.values(this.dataSources);
    }

    getCitation(format = 'apa') {
        const citations = {
            apa: [
                "Falchi, F., Cinzano, P., Duriscoe, D., Kyba, C. C. M., Elvidge, C. D., Baugh, K., ... & Furgoni, R. (2016). The new world atlas of artificial night sky brightness. Science advances, 2(6), e1600377.",
                "Elvidge, C. D., Baugh, K., Zhizhin, M., & Hsu, F. C. (2013). Why VIIRS data are superior to DMSP for mapping nighttime lights. Proceedings of the Asia-Pacific Advanced Network, 35, 62-69.",
                "Gaston, K. J., Bennie, J., Davies, T. W., & Hopkins, J. (2013). The ecological impacts of nighttime light pollution: a mechanistic appraisal. Biological reviews, 88(4), 912-927."
            ],
            chicago: [
                "Falchi, Fabio, et al. \"The new world atlas of artificial night sky brightness.\" Science advances 2, no. 6 (2016): e1600377.",
                "Elvidge, Christopher D., et al. \"Why VIIRS data are superior to DMSP for mapping nighttime lights.\" Proceedings of the Asia-Pacific Advanced Network 35 (2013): 62-69.",
                "Gaston, Kevin J., et al. \"The ecological impacts of nighttime light pollution: a mechanistic appraisal.\" Biological reviews 88, no. 4 (2013): 912-927."
            ]
        };
        
        return citations[format] || citations.apa;
    }
}

// Initialize global API config
window.APIConfig = new APIConfig();
