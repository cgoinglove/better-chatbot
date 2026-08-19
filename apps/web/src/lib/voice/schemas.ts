import { z } from "zod";
import { VOICE_DEVICE_TYPES } from "./types";

export const CreatePairingCodeSchema = z.object({
  deviceType: z.enum(VOICE_DEVICE_TYPES).default("m5stack_atom_echo_s3r"),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const RedeemPairingCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  deviceType: z.enum(VOICE_DEVICE_TYPES),
  displayName: z.string().trim().min(1).max(80),
  firmwareVersion: z.string().trim().max(40).optional(),
});

export const RevokeVoiceDeviceSchema = z.object({
  deviceId: z.string().uuid(),
});

export const VoiceToolRequestSchema = z
  .object({
    toolName: z.string().min(1).max(124),
    mcpServerId: z.string().uuid().optional(),
    mcpToolName: z.string().min(1).max(256).optional(),
    arguments: z.unknown().optional(),
    callId: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (Boolean(value.mcpServerId) === Boolean(value.mcpToolName)) {
      return;
    }
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "mcpServerId and mcpToolName must be provided together",
      path: value.mcpServerId ? ["mcpToolName"] : ["mcpServerId"],
    });
  });

export const VoiceTranscriptSchema = z.object({
  type: z.literal("transcript.final"),
  sessionId: z.string().trim().min(1).max(120),
  // Stable per-utterance id used for idempotency. The device may retry the
  // POST; on a duplicate (userId, sessionId, eventId) we no-op the insert.
  eventId: z.string().trim().min(1).max(120).optional(),
  deviceId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  text: z.string().trim().min(1).max(4000),
  language: z.string().trim().max(16).optional(),
});

export const VoiceSessionModeSchema = z.enum(["voice_command", "long_capture"]);

export const VoiceGatewayCreateSessionSchema = z.object({
  deviceId: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().nullable().optional(),
  deviceSessionId: z.string().trim().min(1).max(160),
  requestedMode: VoiceSessionModeSchema.optional().default("voice_command"),
  reconnect: z.boolean().optional().default(false),
});

export const VoiceGatewaySegmentSchema = z.object({
  sequenceNumber: z.number().int().min(1),
  idempotencyKey: z.string().trim().min(1).max(240),
  providerConnectionId: z.string().trim().min(1).max(240),
  providerSegmentId: z.string().trim().max(240).optional(),
  startMs: z.number().int().min(0).optional(),
  endMs: z.number().int().min(0).optional(),
  text: z.string().trim().min(1),
  isFinal: z.boolean().default(true),
  language: z.string().trim().max(16).optional(),
  confidence: z.number().min(0).max(1).optional(),
  providerPayload: z.record(z.string(), z.unknown()).optional().default({}),
});

export const VoiceGatewayHeartbeatSchema = z.object({
  providerConnectionId: z.string().trim().max(240).optional(),
  lastAudioAt: z.string().datetime().optional(),
  lastSegmentAt: z.string().datetime().optional(),
});

export const VoiceGatewayFinalizeSchema = z.object({
  reason: z.enum([
    "listen-stop",
    "max-duration",
    "idle-timeout",
    "socket-close",
    "provider-error",
    "gateway-shutdown",
    "manual",
  ]),
  status: z.enum(["completed", "interrupted"]).default("completed"),
});

export const VoiceAudioCommandMetadataSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  language: z.string().trim().max(16).optional(),
  durationMs: z.coerce
    .number()
    .int()
    .min(0)
    .max(20 * 60 * 1000)
    .optional(),
  eventId: z.string().trim().max(60).optional(),
  source: z.string().trim().max(80).optional(),
});

export const VoiceDeviceHistoryQuerySchema = z.object({
  deviceId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const DeviceRegistrationSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  deviceType: z.enum(VOICE_DEVICE_TYPES).default("m5stack_atom_echo_s3r"),
  firmwareVersion: z.string().trim().max(40).optional(),
  hardwareId: z.string().trim().max(64).optional(),
});

export const ClaimDeviceRegistrationSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const CompleteDeviceRegistrationSchema = z.object({
  registrationId: z.string().uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});
