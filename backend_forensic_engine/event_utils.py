
def event_value(event, field, default=None):
    """Read a field from either a dictionary or an event object."""
    if isinstance(event, dict):
        return event.get(field, default)

    return getattr(event, field, default)


def locator_value(event, field, default=None):
    """Read a locator field from either a dictionary or an object."""
    locator = event_value(event, "locator")

    if locator is None:
        return default

    return event_value(locator, field, default)
