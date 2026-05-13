function injectHotelsMarker(text, hotels) {
  const marker = `[[HOTELS:${JSON.stringify({ hotels })}]]`;
  return text + "\n" + marker;
}
function injectBookingLinkMarker(text, link) {
  return `${text}\n[[BOOKING_LINK:${JSON.stringify({ link })}]]`;
}

function injectRoomsMarker(text, rooms, hotelName, hotelSlug) {
  const marker = `[[ROOMS:${JSON.stringify({ rooms, hotelName, hotelSlug })}]]`;
  return text + "\n" + marker;
}

export { injectRoomsMarker, injectHotelsMarker, injectBookingLinkMarker };
