-- Add account_type to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'public' CHECK (account_type IN ('public', 'private'));

-- Create connections table
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_connections_requester ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver ON public.connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_requester_status ON public.connections(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_receiver_status ON public.connections(receiver_id, status);

-- Enable RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connections
CREATE POLICY "Users can view their own connections"
  ON public.connections
  FOR SELECT
  USING (
    auth.uid() = requester_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Users can create connection requests"
  ON public.connections
  FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
  );

CREATE POLICY "Users can update their received connections"
  ON public.connections
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own connection requests"
  ON public.connections
  FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Function to get connection count for a user
CREATE OR REPLACE FUNCTION get_connection_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.connections
    WHERE (requester_id = user_id OR receiver_id = user_id)
      AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if two users are connected
CREATE OR REPLACE FUNCTION are_users_connected(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.connections
    WHERE ((requester_id = user1_id AND receiver_id = user2_id)
       OR (requester_id = user2_id AND receiver_id = user1_id))
      AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get connection status between two users
CREATE OR REPLACE FUNCTION get_connection_status(user1_id UUID, user2_id UUID)
RETURNS TABLE(
  connection_id UUID,
  status TEXT,
  requester_id UUID,
  receiver_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT id, connections.status, connections.requester_id, connections.receiver_id
  FROM public.connections
  WHERE (connections.requester_id = user1_id AND connections.receiver_id = user2_id)
     OR (connections.requester_id = user2_id AND connections.receiver_id = user1_id)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for user's connections (accepted only)
CREATE OR REPLACE VIEW user_connections AS
SELECT
  c.id,
  c.requester_id,
  c.receiver_id,
  c.created_at,
  CASE
    WHEN c.requester_id = auth.uid() THEN c.receiver_id
    ELSE c.requester_id
  END as connected_user_id
FROM public.connections c
WHERE (c.requester_id = auth.uid() OR c.receiver_id = auth.uid())
  AND c.status = 'accepted';

-- Grant permissions
GRANT SELECT ON public.connections TO authenticated;
GRANT INSERT ON public.connections TO authenticated;
GRANT UPDATE ON public.connections TO authenticated;
GRANT DELETE ON public.connections TO authenticated;
GRANT EXECUTE ON FUNCTION get_connection_count TO authenticated;
GRANT EXECUTE ON FUNCTION are_users_connected TO authenticated;
GRANT EXECUTE ON FUNCTION get_connection_status TO authenticated;
GRANT SELECT ON user_connections TO authenticated;
