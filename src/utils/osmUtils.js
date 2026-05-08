import axios from "axios";

export async function getOSMData(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'SemTX/1.0' }
    });
    console.log("response.data.osm_id", response.data.osm_id,);
    console.log("response.data.osm_type", response.data.osm_type,);
    return {
      osmId: response.data.osm_id,
      osmType: response.data.osm_type
    };
  } catch (err) {
    console.error("Nominatim error:", err.message);
    return { osmId: null, osmType: null };
  }
}
