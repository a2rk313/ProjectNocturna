import { NextRequest } from 'next/server';

// Define types for our dark sky sites
interface DarkSkySite {
  id: string;
  name: string;
  designation: string; // International Dark Sky Place, Dark Sky Reserve, etc.
  country: string;
  lat: number;
  lng: number;
  area_sq_km: number;
  certification_date: string;
  bortle_class: number; // Average
  sqm_avg: number; // Average SQM reading
  protection_status: 'protected' | 'threatened' | 'degraded';
  website: string;
}

export async function GET(request: NextRequest) {
  try {
    // Query parameters for filtering
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const designation = searchParams.get('designation');
    const minBortle = searchParams.get('minBortle');
    const maxBortle = searchParams.get('maxBortle');
    
    // Sample dark sky sites data
    const darkSkySites: DarkSkySite[] = [
      {
        id: 'dsp-001',
        name: 'Natural Bridges National Monument',
        designation: 'International Dark Sky Monument',
        country: 'United States',
        lat: 37.6061,
        lng: -110.0004,
        area_sq_km: 6.7,
        certification_date: '2007-03-06',
        bortle_class: 2,
        sqm_avg: 21.7,
        protection_status: 'protected',
        website: 'https://www.nps.gov/nhbri/'
      },
      {
        id: 'dsp-002',
        name: 'Cherry Springs State Park',
        designation: 'International Dark Sky Park',
        country: 'United States',
        lat: 41.3314,
        lng: -77.9866,
        area_sq_km: 1.3,
        certification_date: '2008-08-20',
        bortle_class: 3,
        sqm_avg: 21.5,
        protection_status: 'protected',
        website: 'https://www.dcnr.pa.gov/StateParks/FindAPark/CherrySprings/Pages/default.aspx'
      },
      {
        id: 'dsp-003',
        name: 'Exmoor National Park',
        designation: 'International Dark Sky Reserve',
        country: 'United Kingdom',
        lat: 51.1333,
        lng: -3.1667,
        area_sq_km: 692.8,
        certification_date: '2011-01-14',
        bortle_class: 4,
        sqm_avg: 20.8,
        protection_status: 'protected',
        website: 'https://www.exmoor-nationalpark.gov.uk/'
      },
      {
        id: 'dsp-004',
        name: 'Aoraki Mackenzie Dark Sky Reserve',
        designation: 'International Dark Sky Reserve',
        country: 'New Zealand',
        lat: -44.0,
        lng: 170.0,
        area_sq_km: 4367.0,
        certification_date: '2012-06-21',
        bortle_class: 1,
        sqm_avg: 22.0,
        protection_status: 'protected',
        website: 'https://www.aorakimackenzie.org.nz/'
      },
      {
        id: 'dsp-005',
        name: 'Pic du Midi',
        designation: 'International Dark Sky Observatory',
        country: 'France',
        lat: 42.9283,
        lng: 0.1306,
        area_sq_km: 0.25,
        certification_date: '2013-01-18',
        bortle_class: 2,
        sqm_avg: 21.6,
        protection_status: 'protected',
        website: 'https://www.picdumidi.com/'
      },
      {
        id: 'dsp-006',
        name: 'Calar Alto Observatory',
        designation: 'International Dark Sky Reserve',
        country: 'Spain',
        lat: 37.2236,
        lng: -2.5456,
        area_sq_km: 214.0,
        certification_date: '2015-06-15',
        bortle_class: 3,
        sqm_avg: 21.2,
        protection_status: 'protected',
        website: 'https://www.calar-alto.es/'
      },
      {
        id: 'dsp-007',
        name: 'Mont-Mégantic International Dark Sky Reserve',
        designation: 'International Dark Sky Reserve',
        country: 'Canada',
        lat: 45.4389,
        lng: -71.1517,
        area_sq_km: 560.0,
        certification_date: '2007-09-14',
        bortle_class: 2,
        sqm_avg: 21.4,
        protection_status: 'protected',
        website: 'https://meggic.qc.ca/'
      },
      {
        id: 'dsp-008',
        name: 'Kiso Observatory',
        designation: 'International Dark Sky Park',
        country: 'Japan',
        lat: 35.7969,
        lng: 137.6764,
        area_sq_km: 0.15,
        certification_date: '2014-04-10',
        bortle_class: 4,
        sqm_avg: 20.7,
        protection_status: 'threatened',
        website: 'https://www.kiso.mtk.nao.ac.jp/'
      }
    ];
    
    // Apply filters if provided
    let filteredSites = darkSkySites;
    
    if (country) {
      filteredSites = filteredSites.filter(site => 
        site.country.toLowerCase().includes(country.toLowerCase())
      );
    }
    
    if (designation) {
      filteredSites = filteredSites.filter(site => 
        site.designation.toLowerCase().includes(designation.toLowerCase())
      );
    }
    
    if (minBortle) {
      const min = parseInt(minBortle);
      filteredSites = filteredSites.filter(site => site.bortle_class >= min);
    }
    
    if (maxBortle) {
      const max = parseInt(maxBortle);
      filteredSites = filteredSites.filter(site => site.bortle_class <= max);
    }
    
    // Return the filtered results
    return Response.json({
      count: filteredSites.length,
      total_count: darkSkySites.length,
      filters_applied: {
        country: country || null,
        designation: designation || null,
        minBortle: minBortle ? parseInt(minBortle) : null,
        maxBortle: maxBortle ? parseInt(maxBortle) : null
      },
      sites: filteredSites
    });
    
  } catch (error) {
    console.error('Dark Sky API Error:', error);
    return Response.json(
      { 
        error: 'Failed to fetch dark sky sites', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

// POST endpoint to add a new dark sky site (would require authentication in a real app)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Basic validation
    if (!data.name || !data.lat || !data.lng) {
      return Response.json(
        { error: 'Missing required fields: name, lat, lng' },
        { status: 400 }
      );
    }
    
    // In a real app, this would save to a database
    // For now, we'll just return the data that would have been saved
    const newSite = {
      id: `dsp-${Date.now()}`,
      ...data,
      certification_date: new Date().toISOString().split('T')[0],
      sqm_avg: data.sqm_avg || 20.0, // default if not provided
      bortle_class: data.bortle_class || 5, // default if not provided
    };
    
    return Response.json({
      success: true,
      message: 'Dark sky site submitted for review',
      site: newSite
    });
    
  } catch (error) {
    console.error('Add Dark Sky Site Error:', error);
    return Response.json(
      { 
        error: 'Failed to add dark sky site', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}