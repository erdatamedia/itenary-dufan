CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`slug` text NOT NULL,
	`tanggal_mulai` text,
	`tanggal_selesai` text,
	`token_admin` text NOT NULL,
	`token_undangan` text NOT NULL,
	`modul_aktif` text DEFAULT '["kebutuhan","itinerary","bawa","bayar"]' NOT NULL,
	`link_lampiran` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_token_admin_unique` ON `events` (`token_admin`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_token_undangan_unique` ON `events` (`token_undangan`);--> statement-breakpoint
CREATE TABLE `item_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`nama` text NOT NULL,
	`urutan` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`nama` text NOT NULL,
	`harga` integer DEFAULT 0 NOT NULL,
	`qty` real DEFAULT 1 NOT NULL,
	`pj_member_id` text,
	`status` text DEFAULT 'belum' NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `item_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pj_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `itinerary_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`hari` integer NOT NULL,
	`jam_mulai` text,
	`jam_selesai` text,
	`judul` text NOT NULL,
	`lokasi` text,
	`catatan` text,
	`pj_member_id` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pj_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`nama` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`nominal` integer DEFAULT 0 NOT NULL,
	`lunas` integer DEFAULT false NOT NULL,
	`catatan` text,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_member_id_unique` ON `payments` (`member_id`);