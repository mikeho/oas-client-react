class DateOnly extends Date {
	dateOnly = true;

	constructor(...args) {
		// No Args -- construct for Today
		if (args.length === 0) {
			super();

		// String-based Argument
		} else if (args.length === 1 && typeof args[0] === 'string') {
			const date = new Date(args[0]);

			// No Time component provided -- we assume JavaScript sets to Midnight UTC, so let's utilize UTC Date to ensure no conversion for date
			if (args[0].length <= 12)
				super(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

			// Time component provided -- we assume JavaScript has already made adjustments to local timezone.  We utilize local date and ASSUME timezone conversion for date.
			else
				super(date.getFullYear(), date.getMonth(), date.getDate());

		// DateOnly argument -- passthru
		} else if (args.length === 1 && (args[0] instanceof DateOnly)) {
			super(args[0]);

		// Date argument
		} else if (args.length === 1 && (args[0] instanceof Date)) {
			// If UTC Midnight, then we must assume to use UTC Year/Month/Date
			if ((args[0].getUTCHours() === 0) && (args[0].getUTCMinutes() === 0) && (args[0].getUTCSeconds() === 0))
				super(args[0].getUTCFullYear(), args[0].getUTCMonth(), args[0].getUTCDate());
			// Otherwise, we can assume to use Local Year/Month/Date
			else
				super(args[0].getFullYear(), args[0].getMonth(), args[0].getDate());

		// Other Arguments (fallback to Superclass)
		} else {
			super(...args);
		}

		// Normalize to LOCAL midnight
		this.setHours(0, 0, 0, 0);
	}

	toJSON() {
		return this.toLocalISODate();
	}

	toString() {
		return this.toLocalISODate();
	}

	toLocalISODate() {
		const y = this.getFullYear();
		const m = String(this.getMonth() + 1).padStart(2, '0');
		const d = String(this.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	toUTCMidnight() {
		const date = new DateOnly(this);
		return date.setUTCMidnight();
	}

	setUTCMidnight() {
		this.setUTCHours(0, 0, 0, 0);
		return this;
	}
}

export default DateOnly;