
DROP POLICY "Users manage own API keys" ON public.api_keys;

CREATE POLICY "Users manage own API keys"
ON public.api_keys
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
