function injectHotelsMarker(text, hotels) {
  const marker = `[[HOTELS:${JSON.stringify({ hotels })}]]`;
  return text + "\n" + marker;
}

function injectRoomsMarker(text, rooms, hotelName, hotelSlug) {
  const marker = `[[ROOMS:${JSON.stringify({ rooms, hotelName, hotelSlug })}]]`;
  return text + "\n" + marker;
}

export { injectRoomsMarker, injectHotelsMarker };
