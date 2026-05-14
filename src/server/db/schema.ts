import {
    boolean,
    date,
    index,
    integer,
    pgEnum,
    pgTableCreator,
    primaryKey,
    real,
    serial,
    timestamp,
    varchar,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator(
    (name) => `meow-weight-tracker_${name}`,
);

const timestamps = {
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
};

export const users = createTable("users", {
    // Clerk user ID (e.g. user_2abc...). FK target for petPeople.userId.
    id: varchar("id", { length: 256 }).primaryKey(),
    ...timestamps,
});

export const weightUnitEnum = pgEnum("weight_unit", ["kg", "lb"]);

// Per-user display + notification settings. Kept separate from `users`
// (which is Clerk-webhook-synced) so the webhook upsert never clobbers
// preferences. One row per user, created lazily on first read.
export const userPreferences = createTable("user_preferences", {
    userId: varchar("user_id", { length: 256 })
        .primaryKey()
        .references(() => users.id),
    weightUnit: weightUnitEnum("weight_unit").notNull().default("kg"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    dailyRemindersEnabled: boolean("daily_reminders_enabled")
        .notNull()
        .default(true),
    ...timestamps,
});

export const pets = createTable("pets", {
    id: serial("id").primaryKey(),
    species: varchar("species", { length: 64 }).notNull(),
    gender: varchar("gender", { length: 16 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    birthDate: date("birth_date"),
    goalWeight: real("goal_weight"),
    dailyKcalTarget: integer("daily_kcal_target"),
    photoUrl: varchar("photo_url", { length: 1024 }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
});

export const roleEnum = pgEnum("pet_role", ["Owner", "Editor", "Viewer"]);

export const petPeople = createTable(
    "pet_people",
    {
        userId: varchar("user_id", { length: 256 })
            .references(() => users.id)
            .notNull(),
        petId: integer("pet_id")
            .references(() => pets.id)
            .notNull(),
        role: roleEnum("role").notNull(),
        ...timestamps,
    },
    (table) => ({
        pk: primaryKey({ columns: [table.userId, table.petId] }),
        userIdx: index("pet_people_user_id_idx").on(table.userId),
        petIdx: index("pet_people_pet_id_idx").on(table.petId),
    }),
);

export const petInvites = createTable(
    "pet_invites",
    {
        token: varchar("token", { length: 64 }).primaryKey(),
        petId: integer("pet_id")
            .references(() => pets.id)
            .notNull(),
        role: roleEnum("role").notNull(),
        createdBy: varchar("created_by", { length: 256 })
            .references(() => users.id)
            .notNull(),
        expiresAt: timestamp("expires_at", { withTimezone: true }),
        revokedAt: timestamp("revoked_at", { withTimezone: true }),
        acceptedAt: timestamp("accepted_at", { withTimezone: true }),
        acceptedBy: varchar("accepted_by", { length: 256 }).references(
            () => users.id,
        ),
        ...timestamps,
    },
    (table) => ({
        petIdx: index("pet_invites_pet_id_idx").on(table.petId),
    }),
);

export const weightHistory = createTable(
    "weight_history",
    {
        id: serial("id").primaryKey(),
        petId: integer("pet_id")
            .references(() => pets.id)
            .notNull(),
        weighedAt: timestamp("weighed_at", { withTimezone: true }).notNull(),
        weight: real("weight").notNull(),
        ...timestamps,
    },
    (table) => ({
        petIdx: index("weight_history_pet_id_idx").on(table.petId),
    }),
);

export const petFood = createTable(
    "pet_food",
    {
        id: serial("id").primaryKey(),
        name: varchar("name", { length: 256 }).notNull(),
        brand: varchar("brand", { length: 256 }),
        caloriesPerGram: real("calories_per_gram").notNull(),
        proteinPercent: real("protein_percent"),
        fatPercent: real("fat_percent"),
        carbsPercent: real("carbs_percent"),
        notes: varchar("notes", { length: 1024 }),
        ...timestamps,
    },
    (table) => ({
        nameIdx: index("pet_food_name_idx").on(table.name),
    }),
);

export const eatingHistory = createTable(
    "eating_history",
    {
        id: serial("id").primaryKey(),
        petId: integer("pet_id")
            .references(() => pets.id)
            .notNull(),
        foodId: integer("food_id")
            .references(() => petFood.id)
            .notNull(),
        fedAt: timestamp("fed_at", { withTimezone: true }).notNull(),
        quantityGrams: integer("quantity_grams").notNull(),
        ...timestamps,
    },
    (table) => ({
        petIdx: index("eating_history_pet_id_idx").on(table.petId),
    }),
);

export const activityHistory = createTable(
    "activity_history",
    {
        id: serial("id").primaryKey(),
        petId: integer("pet_id")
            .references(() => pets.id)
            .notNull(),
        activityType: varchar("activity_type", { length: 64 }).notNull(),
        durationMinutes: integer("duration_minutes").notNull(),
        performedAt: timestamp("performed_at", { withTimezone: true }).notNull(),
        notes: varchar("notes", { length: 1024 }),
        ...timestamps,
    },
    (table) => ({
        petIdx: index("activity_history_pet_id_idx").on(table.petId),
    }),
);

export const petMeds = createTable(
    "pet_meds",
    {
        id: serial("id").primaryKey(),
        petId: integer("pet_id")
            .references(() => pets.id)
            .notNull(),
        name: varchar("name", { length: 256 }).notNull(),
        dosage: varchar("dosage", { length: 128 }),
        frequencyHours: integer("frequency_hours").notNull(),
        startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
        endsAt: timestamp("ends_at", { withTimezone: true }),
        lastGivenAt: timestamp("last_given_at", { withTimezone: true }),
        notes: varchar("notes", { length: 1024 }),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
        ...timestamps,
    },
    (table) => ({
        petIdx: index("pet_meds_pet_id_idx").on(table.petId),
    }),
);

export const petNotes = createTable(
    "pet_notes",
    {
        id: serial("id").primaryKey(),
        petId: integer("pet_id")
            .references(() => pets.id)
            .notNull(),
        body: varchar("body", { length: 4096 }).notNull(),
        writtenAt: timestamp("written_at", { withTimezone: true }).notNull(),
        writtenBy: varchar("written_by", { length: 256 })
            .references(() => users.id)
            .notNull(),
        ...timestamps,
    },
    (table) => ({
        petIdx: index("pet_notes_pet_id_idx").on(table.petId),
    }),
);

export const healthEvents = createTable(
    "health_events",
    {
        id: serial("id").primaryKey(),
        petId: integer("pet_id")
            .references(() => pets.id)
            .notNull(),
        eventType: varchar("event_type", { length: 64 }).notNull(),
        title: varchar("title", { length: 256 }).notNull(),
        occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
        notes: varchar("notes", { length: 2048 }),
        ...timestamps,
    },
    (table) => ({
        petIdx: index("health_events_pet_id_idx").on(table.petId),
    }),
);

// Gallery of photos for a pet, captured over time. The pet's "primary"
// photo is still `pets.photoUrl`; a gallery row is promoted to primary by
// copying its `url` there (see the photos router `setPrimary`).
export const petPhotos = createTable(
    "pet_photos",
    {
        id: serial("id").primaryKey(),
        petId: integer("pet_id")
            .references(() => pets.id)
            .notNull(),
        url: varchar("url", { length: 1024 }).notNull(),
        caption: varchar("caption", { length: 256 }),
        takenAt: timestamp("taken_at", { withTimezone: true }).notNull(),
        uploadedBy: varchar("uploaded_by", { length: 256 })
            .references(() => users.id)
            .notNull(),
        ...timestamps,
    },
    (table) => ({
        petIdx: index("pet_photos_pet_id_idx").on(table.petId),
    }),
);

export const appointmentStatusEnum = pgEnum("appointment_status", [
    "Scheduled",
    "Completed",
    "Cancelled",
]);

// Upcoming (and past) vet/grooming appointments. Distinct from
// health_events, which is a log of things that already happened — an
// appointment has a forward-looking schedule and a lifecycle status.
export const petAppointments = createTable(
    "pet_appointments",
    {
        id: serial("id").primaryKey(),
        petId: integer("pet_id")
            .references(() => pets.id)
            .notNull(),
        title: varchar("title", { length: 256 }).notNull(),
        appointmentType: varchar("appointment_type", { length: 64 }).notNull(),
        scheduledFor: timestamp("scheduled_for", {
            withTimezone: true,
        }).notNull(),
        location: varchar("location", { length: 256 }),
        notes: varchar("notes", { length: 2048 }),
        status: appointmentStatusEnum("status").notNull().default("Scheduled"),
        createdBy: varchar("created_by", { length: 256 })
            .references(() => users.id)
            .notNull(),
        ...timestamps,
    },
    (table) => ({
        petIdx: index("pet_appointments_pet_id_idx").on(table.petId),
    }),
);
