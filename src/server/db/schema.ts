import {
    date, decimal,
    index, integer, pgEnum,
    pgTableCreator, primaryKey,
    serial,
    timestamp,
    varchar,
    doublePrecision
} from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `meow-weight-tracker_${name}`);

export const Pets = createTable(
    "pets",
    {
        PetID: serial("PetID").primaryKey(),
        Species: varchar('Species'),
        Gender: varchar('Gender'),
        Name: varchar('Name'),
        Age: integer('Age'),
    }
);

export const WeightHistory = createTable(
    "weight_history",
    {
        RecordID: serial('RecordID').primaryKey(),
        PetID: integer('PetID').references(() => Pets.PetID),
        CreatedUTC: timestamp("CreationTime"),
        WeightedUTC: timestamp("WeightTime"),
        Weight: doublePrecision('Weight'),
    },
    (weight_history) => ({
        petIndex: index('weight_history_pet_index').on(weight_history.PetID),
    })
);

export const Users = createTable(
    "users",
    {
        UserID: varchar('UserID', {length: 256}).primaryKey(),
        CreatedAt: timestamp("CreationTime"),
        UpdatedAt: timestamp('UpdatedTime')
    },
    (users) => ({
        userIndex : index('user_id_index').on(users.UserID),
    })
)

export const RoleEnum = pgEnum('Role', [
    'Owner',
    'Editor',
    'Viewer'
])

export const PetPeople = createTable(
    "pet_people",
    {
        UserID: varchar('UserID').references(() => Users.UserID),
        PetID: integer('PetID').references(() => Pets.PetID),
        CreatedAt: timestamp("CreationTime"),
        UpdatedAt: timestamp('UpdatedTime'),
        Role: RoleEnum('Role')
    },
    (petPeople) => ({
        userIndex: index('pet_people_user_id_index').on(petPeople.UserID),
        petIndex: index('pet_people_pet_id_index').on(petPeople.PetID),
        pk: primaryKey({ columns: [petPeople.UserID, petPeople.PetID]})
    })
)

export const PetFood = createTable(
    "pet_food",
    {
        FoodID: serial("FoodID").primaryKey(),
        Name: varchar("Name", { length: 256 }),
        Brand: varchar("Brand", { length: 256 }),
        CaloriesPerGram: decimal("CaloriesPerGram"),
        CaloriesPerLiter: decimal("CaloriesPerLiter"),
        ProteinPercent: decimal("ProteinPercent"), // Optional macro
        FatPercent: decimal("FatPercent"), // Optional macro
        CarbsPercent: decimal("CarbsPercent"), // Optional macro
        Notes: varchar("Notes", { length: 1024 }), // Any other useful information
        CreatedAtUTC: timestamp("CreatedTime"),
        UpdatedAtUTC: timestamp("UpdatedTime"),
    },
    (petFood) => ({
        foodIndex: index("pet_food_name_index").on(petFood.Name), // Index for fast lookup by name
    })
)

export const EatingHistory = createTable(
    "eating_history",
    {
        EntryID: serial("EntryID").primaryKey(),
        PetID: integer('PetID').references(() => Pets.PetID),
        Date: date('Date'),
        CreatedAtUTC: timestamp("CreationTime"),
        FedAtUTC: timestamp("FeedingTime"),
        FoodID: integer("FoodID").references(() => PetFood.FoodID), // Link to PetFood table
        Quantity: integer('Quantity'), //in grams
    },
    (eating_history) => ({
        petIndex: index('eating_history_pet_index').on(eating_history.PetID),
    })
);
