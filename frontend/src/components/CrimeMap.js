import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const hotspots = [
  { city: 'Delhi', lat: 28.6139, lng: 77.2090, crimes: 142, level: 'high' },
  { city: 'Mumbai', lat: 19.0760, lng: 72.8777, crimes: 98, level: 'high' },
  { city: 'Amritsar', lat: 31.6340, lng: 74.8723, crimes: 67, level: 'critical' },
  { city: 'Kolkata', lat: 22.5726, lng: 88.3639, crimes: 54, level: 'medium' },
  { city: 'Chennai', lat: 13.0827, lng: 80.2707, crimes: 43, level: 'medium' },
  { city: 'Srinagar', lat: 34.0837, lng: 74.7973, crimes: 89, level: 'critical' },
  { city: 'Lucknow', lat: 26.8467, lng: 80.9462, crimes: 52, level: 'medium' },
  { city: 'Patna', lat: 25.5941, lng: 85.1376, crimes: 61, level: 'high' },
];

const getColor = (level) => ({
  critical: '#ef4444', high: '#f97316',
  medium: '#eab308', low: '#22c55e'
}[level]);

function CrimeMap() {
  return (
    <div style={{ height: '450px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2d3748' }}>
      <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CartoDB'
        />
        {hotspots.map((spot, i) => (
          <React.Fragment key={i}>
            <Circle
              center={[spot.lat, spot.lng]}
              radius={spot.crimes * 800}
              pathOptions={{ color: getColor(spot.level), fillColor: getColor(spot.level), fillOpacity: 0.3, weight: 2 }}
            />
            <Marker position={[spot.lat, spot.lng]}>
              <Popup>
                <div>
                  <strong>{spot.city}</strong><br/>
                  Active Cases: {spot.crimes}<br/>
                  Level: {spot.level.toUpperCase()}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}

export default CrimeMap;