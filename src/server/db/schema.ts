import {
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

export const pets = createTable("pets", {
    id: serial("id").primaryKey(),
    species: varchar("species", { length: 64 }).notNull(),
    gender: varchar("gender", { length: 16 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    birthDate: date("birth_date"),
    goalWeight: real("goal_weight"),
    dailyKcalTarget: integer("daily_kcal_target"),
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
