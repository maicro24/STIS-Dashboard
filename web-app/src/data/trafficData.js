// Sample traffic data simulating the AI engine output
// This will be replaced by real data from the Python script

export const sampleTrafficData = [
    { time_sec: "0.25", vehicle_count: 3, average_speed_kmh: 12.5, density: 0.3, congestion_level: "Low" },
    { time_sec: "0.50", vehicle_count: 4, average_speed_kmh: 10.2, density: 0.4, congestion_level: "Low" },
    { time_sec: "0.75", vehicle_count: 5, average_speed_kmh: 8.7, density: 0.5, congestion_level: "Medium" },
    { time_sec: "1.00", vehicle_count: 6, average_speed_kmh: 7.3, density: 0.6, congestion_level: "Medium" },
    { time_sec: "1.25", vehicle_count: 7, average_speed_kmh: 5.8, density: 0.7, congestion_level: "High" },
    { time_sec: "1.50", vehicle_count: 8, average_speed_kmh: 4.2, density: 0.8, congestion_level: "High" },
    { time_sec: "1.75", vehicle_count: 9, average_speed_kmh: 3.1, density: 0.9, congestion_level: "Critical" },
    { time_sec: "2.00", vehicle_count: 8, average_speed_kmh: 4.5, density: 0.8, congestion_level: "High" },
    { time_sec: "2.25", vehicle_count: 7, average_speed_kmh: 6.2, density: 0.7, congestion_level: "High" },
    { time_sec: "2.50", vehicle_count: 6, average_speed_kmh: 7.8, density: 0.6, congestion_level: "Medium" },
    { time_sec: "2.75", vehicle_count: 5, average_speed_kmh: 9.4, density: 0.5, congestion_level: "Medium" },
    { time_sec: "3.00", vehicle_count: 4, average_speed_kmh: 11.1, density: 0.4, congestion_level: "Low" },
]

// Camera locations for the Wilaya map
// Using Oran as the Wilaya with multiple intersections
export const cameraLocations = [
    {
        id: 'cam-001',
        name: 'Place 1er Novembre',
        position: [35.6969, -0.6331],
        status: 'offline',
        type: 'intersection',
        description: 'Main city center intersection'
    },
    {
        id: 'cam-002',
        name: 'Boulevard Maata Mohamed El Habib',
        position: [35.6920, -0.6420],
        status: 'offline',
        type: 'arterial',
        description: 'Major commercial boulevard'
    },
    {
        id: 'cam-003',
        name: 'Front de Mer',
        position: [35.7050, -0.6450],
        status: 'offline',
        type: 'roundabout',
        description: 'Seafront promenade roundabout'
    },
    {
        id: 'cam-004',
        name: 'Medina Jdida',
        position: [35.6880, -0.6280],
        status: 'offline',
        type: 'intersection',
        description: 'New city district junction'
    },
    {
        id: 'cam-005',
        name: 'Es-Senia Road',
        position: [35.6750, -0.6100],
        status: 'offline',
        type: 'arterial',
        description: 'Airport access road'
    },
    {
        id: 'cam-006',
        name: 'Hai El Yasmine',
        position: [35.7100, -0.6200],
        status: 'offline',
        type: 'intersection',
        description: 'Residential area crossing'
    },
    {
        id: 'cam-007',
        name: 'Zone Industrielle',
        position: [35.6600, -0.5900],
        status: 'offline',
        type: 'arterial',
        description: 'Industrial zone main access'
    },
    {
        id: 'prototype-001',
        name: 'STIS Prototype Node',
        position: [35.6969, -0.6331],
        status: 'active',
        type: 'prototype',
        description: 'AI-Powered Traffic Control - Active Monitoring',
        isPrototype: true
    }
]

// Wilaya center coordinates
export const wilayaCenter = {
    name: 'Oran',
    arabicName: 'وهران',
    position: [35.6969, -0.6331],
    zoom: 13
}

// Get congestion level based on density
export const getCongestionLevel = (density) => {
    if (density < 0.3) return { level: 'Low', color: '#39ff14' }
    if (density < 0.5) return { level: 'Medium', color: '#ffff00' }
    if (density < 0.8) return { level: 'High', color: '#ff6600' }
    return { level: 'Critical', color: '#ff073a' }
}

// AI Decision logic
export const getAIRecommendation = (density, vehicleCount, averageSpeed) => {
    const congestionPercent = density * 100

    if (congestionPercent > 80) {
        return {
            action: 'EXTEND_GREEN',
            message: 'High congestion detected! Recommend extending green light by 20 seconds.',
            urgency: 'critical',
            details: `${vehicleCount} vehicles in zone, average speed ${averageSpeed.toFixed(1)} km/h`
        }
    }

    if (congestionPercent > 60) {
        return {
            action: 'ADJUST_TIMING',
            message: 'Moderate congestion. Consider extending green light by 10 seconds.',
            urgency: 'warning',
            details: `Traffic flow slowing down - ${vehicleCount} vehicles detected`
        }
    }

    if (congestionPercent > 40) {
        return {
            action: 'MONITOR',
            message: 'Normal traffic conditions. Continue monitoring.',
            urgency: 'info',
            details: 'Traffic flow is within acceptable parameters'
        }
    }

    return {
        action: 'OPTIMIZE',
        message: 'Low traffic. Consider reducing green light duration for efficiency.',
        urgency: 'success',
        details: 'Opportunity to optimize signal timing for cross traffic'
    }
}
